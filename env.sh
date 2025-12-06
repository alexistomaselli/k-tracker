#!/bin/sh

# Recreate config file
rm -rf /usr/share/nginx/html/config.js
touch /usr/share/nginx/html/config.js

# Add assignment
echo "window.env = {" >> /usr/share/nginx/html/config.js

# Read each line in .env file
# Each line represents key=value pairs
printenv | grep VITE_ >> /usr/share/nginx/html/config.js

# Loop over environment variables and add them to config.js
# We only want variables starting with VITE_
echo "window.env = {" > /usr/share/nginx/html/config.js
for i in $(env | grep VITE_)
do
    key=$(echo $i | cut -d '=' -f 1)
    value=$(echo $i | cut -d '=' -f 2-)
    echo "  $key: \"$value\"," >> /usr/share/nginx/html/config.js
done
echo "}" >> /usr/share/nginx/html/config.js

# Start Nginx
nginx -g "daemon off;"
