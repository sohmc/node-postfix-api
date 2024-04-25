# tacomail - An E-mail Server based on AWS Simple Email Service (SES) and DynamoDB

[![codecov](https://codecov.io/gh/sohmc/node-postfix-api/graph/badge.svg?token=B3QX69JM1M)](https://codecov.io/gh/sohmc/node-postfix-api)


Based on my implementation of [postfix + MySQL](https://www.postfix.org/MYSQL_README.html), tacomail aims to replicate the ability to have virtual email addresses that you can create, disable, and pause as needed.

Instead of requiring a standing server, tacomail is deployed in AWS using the following services:

- SES: Uses AWS's [Simple Email Service](https://aws.amazon.com/ses/) to **receive** email
- Lambda: Provides a function-compute that serves an API end-point as well as alias dispositioning (i.e. whether to deliver or bounce an email address).
- DynamoDB: A NoSQL database that replaces MySQL
- S3: Temporary storage while the email awaits final delivery

## NoSQL vs SQL

It is fully possible to implement this solution using a traditional SQL database.  In fact, some of the early commits used AWS RDS.  However, this was abandoned due to the cost of a dedicated database server.  With my limited usage, I will be able to receive and send mail using DynamoDB all within the [Free Tier](https://aws.amazon.com/free/).

Your mileage may vary.

## DynamoDB Schema

The records for tacomail are stored within one DynamoDB table.  This allows us to make maintaining everyone much easier.  This guide will walk you through each record "type", what attributes are used, and how to query and scan the table as needed.

### Table 

Since the bulk of table operations are about email aliases, the keys to the DynamoDB table are parts of an email address:

* Partition Key: `sub_domain`
* Sort Key: `alias_address`

### Aliases

| Attribute | Value | Description |
| --- |  --- | --- |
| `sub_domain` | *domain or subdomain* | A FQDN of a domain or subdomain where you want to create aliases. | 
| `alias_address` | *string* | The "username", or alias, of the email address. |
| `application` | `tacomail` | Literal - Allows alternate key search by `identifier` |
| `active_alias` | *boolean* | Boolean that indicates whether the alias is active or inactive. |
| `ignore_alias` | *boolean* | Boolean that indicates whether the alias is being ignored. |
| `created_datetime` | *Unix datetime* | Number - When the record was created |
| `modified_datetime` | *Unix datetime* | Number - When the record was modified |
| `modified_datetime` | *Unix datetime* | Number - When the record was modified |
| `destination` | *valid email address or 'S3'* | Where emails sent to this address are forwarded.  If set to literal the 'S3', Lambdas that parse through SES mail will drop it into the designated S3 Bucket |
| `destinations` | *map of valid destinations* | (note that this is plural) Not yet implemented, but planned.  This attribute will supersede, but not replace, `destination`.  Emails not local to the system will be forwarded. |
| `full_address` | *fully-formed email address* | The concatenation of `alias_address`, '@', and `sub_domain` (Maintained by tacomail) |
| `identifier` | *uuid* | Universally Unique Identifier used to operate on individual aliases.  This is useful if you want to change the alias's `sub_domain` or change it's alias generally without losing other information.  (Maintained by tacomail) |
| `use_count` | *integer* | Number of times the alias has been used.  Not all that authoritative since it requires an API call to increment it, but might be useful |


### Special records

The following Partition and Sort Keys are reserved by tacomail to hold configuration values:

| `sub_domain` | `alias_addresses` | Attribute | Configuration Information |
| --- |  --- | --- | --- |
| `tacomail-config` | `sub_domains` | configValue | String-Set of domains that are being served |
| `tacomail-config` | `destinations` | configValue | String-Set of destinations email aliases will forward to |

## Lambda Functions

Three Lambda Functions are deployed to use tacomail.

### tacomail-api

This function enables the API, allowing you and external applications to poll the DynamoDB tables for various information.  The installation of this function is recommended, especially if you are using the [tacomail frontend](https://github.com/sohmc/tacomail-frontend).

Three main API endpoints are available via a Lambda URL call.  How to access these APIs are available via the schema documentation.

### tacomail-ses

This function is used by SES rules to check alias availability.  Installation of this function is required if you want AWS SES to be able to filter your emails.

At current this function is synchronous, requiring the function to process the message live so that it can disposition the email properly.  Future versions will change this behavior to be asynchronous so do not rely on this behavior.

### s3handler

This function is used by S3 to post the message into EFS for final local delivery.

### Environment Variables

The code uses the following environment variables:

| Variable Name | Value | Description |
| --- |  --- | --- |
| POSTFIX_DYNAMODB_TABLE | DynamoDB Table Name | **Required** Specifies the DynamoDB table where alias information is stored. |

