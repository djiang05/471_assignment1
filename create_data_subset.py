######################################
# The code is not working at an acceptable speed for all the observations. 
# This script just takes a small subset of the data for the purposes of allowing our d3 scripts to handle the amount of data.

# Note to graders: this script is only included in the repo for transparency purposes. It does NOT do any further data processing, it is only run once for the purposes described above. All other parts of this assignment are handled via d3 JavaScript.
######################################

import pandas as pd

n = 1000 # include every nth record

all_data = pd.read_csv('./data/Crimes_-_2001_to_Present_20261007.csv', low_memory=False)
data_subset = all_data[all_data.index%n == 0]

data_subset.to_csv('./data/data_subset.csv', index=False)