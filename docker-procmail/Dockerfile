FROM public.ecr.aws/docker/library/python:3.11-bullseye

# Update apt and install procmail
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install procmail -y

RUN pip install --upgrade pip

RUN pip install awslambdaric