#!/bin/bash

# Inspired by danmaas:
#   https://gist.github.com/danmaas/4076eae78c7b8062c30d87f46060e331

# Fetch emails that are saved onto AWS EFS (deposited by the Amazon SES receiver's S3 action)
# and feed to maildrop. In the spirit of fetchmail, but using file instead of SMTP.

# Cron entry:
# */30 * * * * $HOME/.local/bin/fetch-dropped-email.bash >> $HOME/cache/ses-fetchlog 2>&1

SES_DELIVERY_DIR="/opt/sesDelivery/username"
MAILDROP="/usr/bin/maildrop"

# for each object in the bucket...
for F in ${SES_DELIVERY_DIR}/*; do
  DATETIME=$(date --rfc-3339=seconds)
  if [ "${F}" == "AMAZON_SES_SETUP_NOTIFICATION" ]; then
    continue # ignore this object SES creates during set-up
  fi

  # download the object and feed it on stdin to MAILDROP
  if ! cat "${F}" | ${MAILDROP}; then
    echo "${DATETIME} MAILDROP fetch of ${F} failed with status $?"
  else
    echo "${DATETIME} $0 successfully fetched ${F}"

    # success - delete the S3 object
    rm "${F}"
  fi
done
