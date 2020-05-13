FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
    build-essential git wget curl unzip

RUN curl -sL https://deb.nodesource.com/setup_11.x | bash - && apt-get install -y nodejs
RUN wget https://github.com/tendermint/tendermint/releases/download/v0.33.2/tendermint_0.33.2_linux_amd64.zip
RUN unzip tendermint_0.33.2_linux_amd64.zip
RUN chmod +x tendermint
RUN mv tendermint /usr/local/bin
RUN tendermint init
COPY docker/config.toml /root/.tendermint/config/config.toml

COPY package.json .
RUN npm install
COPY . .

EXPOSE 26656 26657 26658 3001
ENTRYPOINT ["npm", "run", "blockchain"]
