import os
from rele_utils import util

def main():
  '''
  1. Runs write_dependencies function
  2. Run run_the_yaml_command, get "dir" name on releai repo, this value come from outside
  '''
  util.run_the_yaml_command("packages", os.environ['PACKAGE'])

if __name__ == '__main__':
  main()
