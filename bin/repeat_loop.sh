#!/bin/bash

REPEAT_TIMES=$1
shift
for ((i = 0; i <= $REPEAT_TIMES; i++)); do
  echo Run $i
  $@
  RESULT=$?
  if [ $RESULT != 0 ]; then
    break
  fi
done

exit $RESULT
