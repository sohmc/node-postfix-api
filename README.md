# tacomail - An E-mail Server based on AWS Simple Email Service (SES) and DynamoDB

Based on my implementation of [postfix + MySQL](https://www.postfix.org/MYSQL_README.html), tacomail aims to replicate the ability to have virtual email addresses that you can create, disable, and pause as needed.

Instead of requiring a standing server, tacomail is deployed in AWS using the following services:

- SES: Uses AWS's [Simple Email Service](https://aws.amazon.com/ses/) to **receive** email
- Lambda: Provides a function-compute that serves an API end-point as well as alias dispositioning (i.e. whether to deliver or bounce an email address).
- DynamoDB: A NoSQL database that replaces MySQL

## NoSQL vs SQL

It is fully possible to implement this solution using a traditional SQL database.  In fact, some of the early commits used AWS RDS.  However, this was abandoned due to the cost of a dedicated database server.  With my limited usage, I will be able to receive and send mail using DynamoDB all within the [Free Tier](https://aws.amazon.com/free/).

Your milage may vary.

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
| `alias_address` | `tacomail-config` | The "username", or alias, of the email address. |
| `application` | `tacomail` | Literal - Allows alternate key search by `identifier` |
| `active_alias` | *boolean* | Boolean that indicates whether the alias is active or inactive. |
| `ignore_alias` | *boolean* | Boolean that indicates whether the alias is being ignored. |
| `created_datetime` | *Unix datetime* | Number - When the record was created |
| `modified_datetime` | *Unix datetime* | Number - When the record was modified |
| `modified_datetime` | *Unix datetime* | Number - When the record was modified |
| `destination` | *valid email address or 'S3'* | Where emails sent to this address are forwarded.  If set to literal the 'S3', Lambdas that parse through SES mail will drop it into the designated S3 Bucket |
| `full_address` | *fully-formed email address* | The concatenation of `alias_address`, '@', and `sub_domain` (Maintained by tacomail) |
| `identifier` | *uuid* | Universally Unique Identifier used to operate on individual aliases.  This is useful if you want to change the alias's `sub_domain` or change it's alias generally without losing other information.  (Maintained by tacomail) |
| `use_count` | *integer* | Number of times the alias has been used.  Not all that authoritative since it requires an API call to increment it, but might be useful |


### Special records

The following Partition and Sort Keys are reserved by tacomail to hold configuration values:

| `sub_domain` | `alias_addresses` | Attribute | Configuration Information |
| --- |  --- | --- | --- |
| `tacomail-config` | `sub_domains` | configValue | String-Set of domains that are being served |
| `tacomail-config` | `destinations` | configValue | String-Set of destinations email aliases will forward to |


## Resource notes

* [Maildir naming schema](http://cr.yp.to/proto/maildir.html)