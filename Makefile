deploy:
	rsync -avhzL --delete \
				--no-perms --no-owner --no-group \
				--exclude .git \
				--filter=":- .gitignore" \
				. ubuntu@178.128.58.128:/home/ubuntu/workspace/icetea
	ssh ubuntu@178.128.58.128 "cd /home/ubuntu/workspace/icetea && npm i && npm run build"