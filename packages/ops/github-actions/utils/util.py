import urllib3
import google.auth
import json
import json, collections
import subprocess, os, yaml, io
from kubernetes import client
from google.cloud.container_v1 import ClusterManagerClient

path = os.path.join(os.environ['GITHUB_WORKSPACE'])
config_envs = {} ## this object outside beacuse of the for loop

def return_local_env(env):
  '''
  return the full name of the env.
  '''
  env_obj = {
    "dev": "development",
    "prod": "production",
    "prod-eu": "production-eu"
  }
  local_env = env_obj.get(env)
  if local_env:
    return local_env
  return env

def get_cluster_metadata(env_on_yaml):
  '''
  get string var from "releai-config.yaml", coul'd be "development" or "production"
  connect to cluster with the name of the env from outside
  at the end returns values from the values object
  '''
  values = {
    "production-eu": {
      "name": "bot-ms-eu-juan",
      "region": "europe-west2",
      "project": "releai-bot-prod",
    },
    "production": {
      "name": "bot-ms-1",
      "region": "us-west4",
      "project": "releai-bot-prod",
    },
    "development": {
      "name": "bot-ms-1",
      "region": "europe-west3",
      "project": "releai-bot-dev",
      "creds": f"{path}/ops/keys/releai-bot-dev.json"
    }
  }
  cmd = {
    "name": values.get(env_on_yaml).get('name'),
    "region": values.get(env_on_yaml).get('region'),
    "project": values.get(env_on_yaml).get('project'),
    "creds": values.get(env_on_yaml).get('creds', f'{path}/ops/keys/releai-bot-prod.json')
  }
  return cmd

def kube_command_obj(cluster_values):
  '''
  this function include all the k8s that we using
  '''
  urllib3.disable_warnings() ## disabled warnings
  os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = cluster_values.get('creds')
  credentials, _p = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform',])
  credentials.refresh(google.auth.transport.requests.Request())

  cluster_manager_client = ClusterManagerClient(credentials=credentials)
  cluster = cluster_manager_client.get_cluster(name=f"projects/{cluster_values.get('project')}/locations/{cluster_values.get('region')}/clusters/{cluster_values.get('name')}")
  configuration = client.Configuration()
  configuration.host = f"https://{cluster.endpoint}:443"
  configuration.verify_ssl = False
  configuration.api_key = {"authorization": "Bearer " + credentials.token}

  client.Configuration.set_default(configuration)
  v1 = client.CoreV1Api() # this is foe configMap
  v2 = client.AppsV1Api() # this is for deployment

  kube_commands = {
    "pod_list": v2.list_namespaced_deployment, ## https://github.com/kubernetes-client/python/blob/master/kubernetes/docs/AppsV1Api.md#list_namespaced_deployment
    "config_map_list": v1.list_namespaced_config_map, ## GET /api/v1/namespaces/{namespace}/configmaps
    "config_map_patch": v1.patch_namespaced_config_map, ## PATCH /api/v1/namespaces/{namespace}/configmaps/{name}
    "config_map_create": v1.create_namespaced_config_map, ## POST /api/v1/namespaces/{namespace}/configmaps
    "deployment_patch": v2.patch_namespaced_deployment, ## https://github.com/kubernetes-client/python/blob/master/kubernetes/docs/AppsV1Api.md#patch_namespaced_deployment
  }

  return kube_commands

def export_values(env_on_yaml):
  config_map_values = yaml.load(open(f"{path}/ops/k8s-configmaps/configMap-{env_on_yaml}.yaml").read(),Loader=yaml.FullLoader)['data']
  for key, value in config_map_values.items():
    os.environ[key] = value
    print(os.environ)

def kube_config_map(filename, kube_command):
  '''
  this functions checks for the exist config map on the cluster and update/ create it.
  '''
  with open(f"{path}/ops/k8s-configmaps/configMap-{filename}.yaml") as f:
    config_map_obj = json.loads(json.dumps(yaml.safe_load(f)))

  configmap_name = config_map_obj.get("metadata").get("name")
  configmap_namespace = config_map_obj.get("metadata").get("namespace")

  config_maps = []

  return_config_map_list = kube_command.get("config_map_list")(namespace=configmap_name)
  for item in return_config_map_list._items:
    config_maps.append(item.metadata.name)
  try:
    if configmap_name in config_maps:
      res = kube_command.get("config_map_patch")(name=configmap_namespace, namespace=configmap_name, body=config_map_obj)
      if res.metadata.managed_fields[0].operation == "Update":
        status = "Update"
    else:
      res = kube_command.get("config_map_create")(namespace=configmap_namespace, body=config_map_obj)
      status = "Created"
    if res.metadata.managed_fields[0].operation == "Update":
      return "ConfigMap " + status
  except Exception as e:
    raise Exception("configMap Faild to create \ update", e)
  return "configMap Failed"

def update_deployment(src, kube_command, git_tag_name):
  '''
  this function update the service deploment
  '''
  with open(f"{path}/ops/k8s/{src}.yaml") as f:
    deployment_obj = list(yaml.load_all(f .read(),Loader=yaml.FullLoader))[0]
    new_deploment_name = f"eu.gcr.io/releai-bot-dev/{src}:{git_tag_name}"
    deployment_obj.get("spec").get("template").get("spec").get("containers")[0]['image'] = new_deploment_name
  deployment_name = deployment_obj.get("metadata").get("name")
  deployment_namespace = deployment_obj.get("metadata").get("namespace")
  new_deployment_obj = json.loads(json.dumps(deployment_obj))
  deployment_list = []
  deployments = kube_command.get("pod_list")(namespace=deployment_namespace)
  for deployment in deployments._items:
    deployment_list.append(deployment.metadata.name)
  if src in deployment_list:
    try:
      message = kube_command.get("deployment_patch")(name=deployment_name, namespace=deployment_namespace, body=new_deployment_obj)
      if "has successfully progressed" in message.status.conditions[1].message:
        return f"{src} deployment patched"
      else:
        return f"{src} deployment failed"
    except Exception as e:
      raise Exception(e)
  raise Exception(f"The deployment of the {src} not found, {deployment_namespace} namespace")

def bash_subprocess(file_path, file):
  '''
  This is subprocess generic functions, get the path and the file name
  '''
  subprocess.run(f"bash {path}/{file_path}/{file}", shell=True)

def load_src_yaml(dir, id):
  '''
  This function load the service yaml file
  '''
  if dir == "None":
    loaded_yaml = yaml.load(open(f"{path}/{id}/releai-config.yaml").read(),Loader=yaml.FullLoader)
  else:
    loaded_yaml = yaml.load(open(f"{path}/{dir}/{id}/releai-config.yaml").read(),Loader=yaml.FullLoader)
  return loaded_yaml

def configmap_file_path(env_on_yaml):
  '''
  This function returns the config map path.
  '''
  configmap_path = f"{path}/ops/k8s-configmaps/configmap-{env_on_yaml}.yaml"
  return configmap_path

def src_list_dir_obj():
  '''
  this function returns the service dir list
  '''
  os.chdir(f"{path}/src")
  src_list_dir = os.listdir()
  for src in src_list_dir:
    if src.endswith(".md") or src.startswith("."):
      src_list_dir.remove(src)
  return src_list_dir

def run_the_yaml_command(dir, id):
  '''
  Load and run each test command under "releai-config.yaml"
  '''
  config = load_src_yaml(dir, id)
  ch_dir(dir, id)
  for command in config['development']['scripts']['test']:
    p = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, shell=True)
    output, e = p.communicate()
    print(output)
    if p.wait() != 0:
      raise Exception(e)

def ch_dir(dir, id):
  '''
  This function change dir, get the directory and the id of the service.
  '''
  os.chdir(f"{path}/{dir}/{id}")

def collect_envs(dir, env_on_yaml, src_list_dir):
  '''
  This function build a object from the yaml that in each service
  '''
  for src in src_list_dir:
    loaded_yaml = load_src_yaml(dir, src)[env_on_yaml]['environment']
    if loaded_yaml is not None:
      for var in loaded_yaml:
        config_envs.update(var)
  loaded_yaml = load_src_yaml("None", "web")[env_on_yaml]['environment']
  if loaded_yaml is not None:
    for var in loaded_yaml:
      config_envs.update(var)
  return dict(collections.OrderedDict(sorted(config_envs.items())))

def create_configmap(config_envs_obj, configmap):
  '''
  create config map from the object that include all the parameters.
  this file will be updated in "rb/ops/k8s-configmap" dir
  '''
  data = {
    "apiVersion": "v1",
    "kind": "ConfigMap",
    "metadata": {
        "name": "releai",
        "namespace": "releai"
    },
    "data": config_envs_obj
  }
  with io.open(configmap, 'w', encoding='utf8') as f:
      yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def patch_update_package_version(package):
  '''
  update the the package version (patch update + 0.0.2)
  package is the name of the package inside the cli
  '''
  # change the current directory to the require package directory
  dir = "packages"
  ch_dir(dir,package)

  # read package.json to retrive the current package version
  f = open('package.json')

  # get the package.json as a dictionary
  data = json.load(f)
  curr_version = data['version']
  curr_version = curr_version.split(".")
  if curr_version[2] > 
