deploy:
	npm run build
	rsync -avhzL --delete \
				--no-perms --no-owner --no-group \
				--exclude .git \
				--filter=":- .gitignore" \
				. ubuntu@178.128.58.128:/home/ubuntu/workspace/icetea
	rsync -avhzL --delete \
				--no-perms --no-owner --no-group \
				./web_dist ubuntu@178.128.58.128:/home/ubuntu/workspace/icetea/web_dist
	ssh ubuntu@178.128.58.128 "cd /home/ubuntu/workspace/icetea && npm i"