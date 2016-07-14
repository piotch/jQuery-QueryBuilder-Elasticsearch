/*
* jQuery QueryBuilder Elasticsearch 'bool' query support
* https://github.com/mistic100/jQuery-QueryBuilder
* https://www.elastic.co/
* https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html
*/

// Register plugin
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'query-builder'], factory);
    }
    else {
        factory(root.jQuery);
    }
}(this, function($) {
    "use strict";

    var QueryBuilder = $.fn.queryBuilder;

    // DEFAULT CONFIG
    // ===============================
    QueryBuilder.defaults({
        ESBoolOperators: {
            equal:            function(v){ return v; },
            not_equal:        function(v){ return v; },
            less:             function(v){ return {'lt': v}; },
            less_or_equal:    function(v){ return {'lte': v}; },
            greater:          function(v){ return {'gt': v}; },
            greater_or_equal: function(v){ return {'gte': v}; },
            between:          function(v){ return {'gte': v[0], 'lte': v[1]}; },
            in :              function(v){ return v.split(',').map(function(e) { return e.trim();}); }
        },
        ESQueryStringQueryOperators: {
            is_not_null:           function(){ return "_exists_:"; },
            is_null:          function(){ return "_missing_:";},
            contains:         function(v){ return v; },
            between:          function(v){ return '[' + v[0] + ' TO '+ v[1] + "]"; },
        }
    });


    // PUBLIC METHODS
    // ===============================
    QueryBuilder.extend({
        /**
        * Get rules as an elasticsearch bool query
        * @param data {object} (optional) rules
        * @return {object}
        */
        getESBool: function(data) {
            data = (data===undefined) ? this.getRules() : data;

            var that = this;

            return (function parse(data) {
                if (!data.condition) {
                    data.condition = that.settings.default_condition;
                }

                if (['AND', 'OR'].indexOf(data.condition.toUpperCase()) === -1) {
                    error('Unable to build Elasticsearch bool query with condition "{0}"', data.condition);
                }

                if (!data.rules) {
                    return {};
                }

                var parts = {};
                parts.add = function (k, v) {
                    if (this.hasOwnProperty(k)) { this[k].push(v) }
                    else { this[k] = [v] }
                };

                data.rules.forEach(function(rule) {

                    function get_value(rule) {
                        if (rule.data && rule.data.hasOwnProperty('transform')) {
                            return window[rule.data.transform].call(this, rule.value);
                        } else {
                            return rule.value;
                        }
                    }

                    function make_query(rule) {
                        var mdb = that.settings.ESBoolOperators[rule.operator],
                        ope = that.getOperatorByType(rule.operator),
                        part = {};

                        if (mdb === undefined) {
                            error('Unknown elasticsearch operation for operator "{0}"', rule.operator);
                        }

                        if (ope.nb_inputs !== 0) {
                            var es_key_val = {};
                            es_key_val[rule.field] =  mdb.call(that, get_value(rule));
                            part[getQueryDSLWord(rule)] = es_key_val;
                        }

                        if (data.condition === 'OR' && rule.operator === 'not_equal') {
                            return {'bool': {'must_not': [part]}}
                        } else {
                            return part
                        }
                    }

                    var clause = getClauseWord(data.condition, rule.operator);

                    if (rule.rules && rule.rules.length>0) {
                        parts.add(clause, parse(rule));
                    } else {
                        parts.add(clause, make_query(rule));
                    }

                });

                delete parts.add;
                return {'bool': parts}
            }(data));
        },

        /**
        * Get rules as an elasticsearch query string query
        * @param data {object} (optional) rules
        * @return {object}
        */
        getESQueryStringQuery: function(data) {
            data = (data===undefined) ? this.getRules() : data;

            var that = this;

            return (function parse(data) {
                if (!data.condition) {
                    data.condition = that.settings.default_condition;
                }

                if (['AND', 'OR'].indexOf(data.condition.toUpperCase()) === -1) {
                    error('Unable to build Elasticsearch query String query with condition "{0}"', data.condition);
                }

                if (!data.rules) {
                    return "";
                }

                // generate query string
                var parts = "";

                data.rules.forEach(function(rule, index) {
                    function get_value(rule) {
                            return rule.value;
                    }

                    function make_query(rule) {
                        var mdb = that.settings.ESQueryStringQueryOperators[rule.operator],
                        ope = that.getOperatorByType(rule.operator),
                        part = "";

                        if (mdb === undefined) {
                            error('Unknown elasticsearch operation for operator "{0}"', rule.operator);
                        }

                        var es_key_val = "";
                        if (ope.nb_inputs !== 0) {
                            es_key_val += rule.field + ":" + mdb.call(that, rule.value);
                            part += es_key_val;
                        }
                        else if (ope.nb_inputs === 0) {
                            es_key_val += mdb.call(that, rule.value) + rule.field;
                            part += es_key_val;
                        }

                        if(data.rules[index+1]) {
                            return part + " " + data.condition + " ";
                        }
                        else {
                            return part;
                        }

                    }
                    if (rule.rules && rule.rules.length>0) {
                        console.log(parts);
                        parts += "(" + parse(rule) + ")";
                    } else {
                        parts += make_query(rule);
                    }

                });
                return parts;
            }(data));
        }
    });

    /**
    * Get the right type of query term in elasticsearch DSL
    */
    function getQueryDSLWord(rule) {
        if (rule.operator === 'equal' || rule.operator === 'not_equal') {
            if (rule.value.indexOf('*') > -1 || rule.value.indexOf('?') > -1) {
                return 'wildcard';
            } else {
                return 'term';
            }
        }

        if (rule.operator === 'in') {
            return 'terms';
        }

        else {
            return 'range';
        }
    }

    /**
    * Get the right type of clause in the bool query
    */
    function getClauseWord(condition, operator) {
        if (condition === 'AND' && operator !== 'not_equal') { return 'must' }
        if (condition === 'AND' && operator === 'not_equal') { return 'must_not' }
        if (condition === 'AND' && operator === 'not_equal') { return 'must_not' }
        if (condition === 'OR') { return 'should' }
    }

}));
