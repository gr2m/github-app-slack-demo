FROM node:20-slim

WORKDIR /opt/app

COPY ./package.json .
COPY ./package-lock.json .
RUN npm install

COPY ./scripts ./scripts
COPY ./src ./src
COPY .env .

RUN useradd -m githubApp

USER githubApp

CMD [ "npm", "run", "dev"]
