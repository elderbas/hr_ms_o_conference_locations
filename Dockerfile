FROM node:current-slim

RUN mkdir -p /code
WORKDIR /code

COPY package.json .
RUN npm i

COPY . .

CMD ["npm", "start"]

