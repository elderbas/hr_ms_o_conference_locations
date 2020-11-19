FROM node:current-slim

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json .
RUN npm i

EXPOSE 9000
EXPOSE 27017 
ENV MONGODB_URI mongodb://host.docker.internal:27017/hr-ms-o-conference-locations

CMD ["npm", "start"]

COPY . .
