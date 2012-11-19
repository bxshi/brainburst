#!/usr/bin/python

import os
import time

while(1):
    time.sleep(1)
    os.system("netstat -nat | grep -i \"9876\"|wc -l")