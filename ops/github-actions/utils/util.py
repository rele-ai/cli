import subprocess, os, yaml

path = os.path.join(os.environ['GITHUB_WORKSPACE'])
config_envs = {} ## this object outside beacuse of the for loop

def load_src_yaml(dir, id):
  '''
  This function load the service yaml file
  '''
  loaded_yaml = yaml.load(open(f"{path}/{dir}/{id}/releai-config.yaml").read(),Loader=yaml.FullLoader)
  return loaded_yaml

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
