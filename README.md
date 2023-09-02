# tacomail - An E-mail Server based on AWS Simple Email Service (SES) and DynamoDB

Based on my implementation of [postfix + MySQL](https://www.postfix.org/MYSQL_README.html), tacomail aims to replicate the ability to have virtual email addresses that you can create, disable, and pause as needed.

Instead of requiring a standing server, tacomail is deployed in AWS using the following services:

- SES: Uses AWS's [Simple Email Service](https://aws.amazon.com/ses/) to **receive** email
- Lambda: Provides a function-compute that serves an API end-point as well as alias dispositioning (i.e. whether to deliver or bounce an email address).
- DynamoDB: A NoSQL database that replaces MySQL

## NoSQL vs SQL

It is fully possible to implement this solution using a traditional SQL database.  In fact, some of the early commits used AWS RDS.  However, this was abandoned due to the cost of a dedicated database server.  With my limited usage, I will be able to receive and send mail using DynamoDB all within the [Free Tier](https://aws.amazon.com/free/).

Your milage may vary.

## Resource notes

* [Maildir naming schema](http://cr.yp.to/proto/maildir.html)