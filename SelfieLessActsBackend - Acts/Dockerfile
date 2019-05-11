FROM alpine:latest

ENV TEAM_ID=CC_011_023_054

RUN apk add --update nodejs nodejs-npm


RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
 
# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install
 
# Bundle app source
COPY . /usr/src/app
 
EXPOSE 80

CMD [ "node", "index_acts.js" ]

