#!/usr/bin/env bash
# Tear down everything (including the Postgres volume / uploaded documents).
set -euo pipefail
kubectl delete namespace text-extract --ignore-not-found
