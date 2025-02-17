#!/bin/bash

# Inspired by danmaas:
#   https://gist.github.com/danmaas/4076eae78c7b8062c30d87f46060e331

# Fetch emails from Amazon S3 (deposited by the Amazon SES receiver's S3 action)
# and feed to maildrop. In the spirit of fetchmail, but using S3 instead of SMTP.

BUCKET="my-bucket-name"
MAILDROP="/usr/bin/maildrop"

# for each object in the bucket...
for F in `aws s3 ls "s3://${BUCKET}/" | awk '{print $4;}'`; do
  DATETIME=$(date --rfc-3339=seconds)
  if [ "${F}" == "AMAZON_SES_SETUP_NOTIFICATION" ]; then
    continue # ignore this object SES creates during set-up
  fi

  # download the object and feed it on stdin to MAILDROP
  if ! aws s3 cp "s3://${BUCKET}/${F}" - | ${MAILDROP}; then
    echo "${DATETIME} S3->MAILDROP fetch of ${F} failed with status $?"
  else
    echo "${DATETIME} $0 successfully fetched ${F}"

    # success - delete the S3 object
    aws s3 rm "s3://${BUCKET}/${F}" --quiet
  fi
done
