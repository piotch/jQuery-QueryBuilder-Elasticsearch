[![Build Status](https://travis-ci.org/piotch/jQuery-QueryBuilder-Elasticsearch.svg?branch=master)](https://travis-ci.org/piotch/jQuery-QueryBuilder-Elasticsearch)

# jQuery QueryBuilder Elasticsearch

Allows to export [jQuery QueryBuilder](http://mistic100.github.io/jQuery-QueryBuilder) rules as an Elasticsearch [bool query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html).

### Dependencies
 * jQuery QueryBuilder >= 2.0

## Usage

The plugin adds a new public method to all QueryBuilder instances.

### getESBool

Performs validation and returns the rules as a valid Elasticsearch bool query.

```js
var esQuery = $('#builder').queryBuilder('getESBool');
```

### Operators configuration

The Elasticsearch plugin requires special configuration for operators to convert rules. This configuration is stored in the ```ESBoolOperators``` option, see the source code for more details.

## Dev

### Run tests

`$ grunt test --verbose`
