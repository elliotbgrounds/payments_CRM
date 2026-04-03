#!/bin/bash

docker login -u ${ARTIFACTORY_USER} -p ${ARTIFACTORY_API_TOKEN} docker-vault-pen-release.dr.corp.adobe.com

docker run --rm -it docker-vault-pen-release.dr.corp.adobe.com/vault-pen:latest

export VAULT_ADDR=https://vault-amer.adobe.net
vault login -method=okta
# This example uses the `ethos` Vault mount with a secret path called `newbuildvar` and a field `barfield`
vault kv put -mount=ethos myservice/flex/newbuildvar barfield=123
