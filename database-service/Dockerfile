FROM mysql

ENV TEAM_ID=CC_011_023_054

ENV MYSQL_ROOT_PASSWORD secretsauce  
# ENV MYSQL_USER users_service  
# ENV MYSQL_PASSWORD 123

ADD setup.sql /docker-entrypoint-initdb.d
