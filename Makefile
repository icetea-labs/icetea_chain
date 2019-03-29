deploy:
	npm run build
	# rsync -avhzL --delete \
	# 			--no-perms --no-owner --no-group \
	# 			--exclude .git \
	# 			--filter=":- .gitignore" \
	# 			. $(user)@$(host):/home/$(user)/workspace/icetea
	rsync -avhzL --delete \
				--no-perms --no-owner --no-group \
				./web_dist $(user)@$(host):/home/$(user)/workspace/icetea
	# ssh $(user)@$(host) "cd /home/$(user)/workspace/icetea && npm i"