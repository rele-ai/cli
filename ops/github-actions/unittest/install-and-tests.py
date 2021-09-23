import subprocess, os, yaml

path = os.path.join(os.environ['GITHUB_WORKSPACE'])

def load_src_yaml(dir, id):
  '''
  This function load the service yaml file
  '''
  print(dir,id)
  loaded_yaml = yaml.load(open(f"{path}/{dir}/{id}/releai-config.yaml").read(),Loader=yaml.FullLoader)
  return loaded_yaml

def run_the_yaml_command(dir, id):
  '''
  Load and run each test command under "releai-config.yaml"
  '''
  print("Saar1")
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

def main():
  '''
  1. Runs write_dependencies function
  2. Run run_the_yaml_command, get "dir" name on releai repo, this value come from outside
  '''
  run_the_yaml_command("packages", os.environ['PACKAGE'])

if __name__ == '__main__':
  main()
