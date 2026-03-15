#!/bin/sh
set -eu

export POSTFIX_MYHOSTNAME="${POSTFIX_MYHOSTNAME:-nayonne.ovh}"
export POSTFIX_MYDOMAIN="${POSTFIX_MYDOMAIN:-nayonne.ovh}"
export POSTFIX_MYORIGIN="${POSTFIX_MYORIGIN:-nayonne.ovh}"
export POSTFIX_MYNETWORKS="${POSTFIX_MYNETWORKS:-127.0.0.0/8 172.16.0.0/12 10.0.0.0/8 192.168.0.0/16}"
export POSTFIX_MESSAGE_SIZE_LIMIT="${POSTFIX_MESSAGE_SIZE_LIMIT:-26214400}"
export POSTFIX_RELAYHOST="${POSTFIX_RELAYHOST:-}"

envsubst < /etc/postfix/main.cf.template > /etc/postfix/main.cf

postfix check

exec "$@"