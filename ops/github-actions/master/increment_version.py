import os
from rele_utils import util


def main():
  '''
  This is main function made for replace the image on k8s
  '''
  new_version = util.increment_version(os.environ['PACKAGE'])
  # just print
  print(f"this is the new version of {os.environ['PACKAGE']}: ", new_version)

if __name__ == '__main__':
  main()
