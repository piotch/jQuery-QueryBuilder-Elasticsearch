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
        is_null:          function(v){ return v; },
        is_not_null:      function(v){ return v; },
        is_empty:         function(v){ return v; },
        is_not_empty:     function(v){ return v; },
        equal:            function(v){ return v; },
        not_equal:        function(v){ return v; },
        begins_with:      function(v){ return v+'*'; },
        ends_with:        function(v){ return '*'+v; },
        contains:         function(v){ return '*'+v+'*'; },
        not_begins_with:  function(v){ return v+'*'; },
        not_ends_with:    function(v){ return '*'+v; },
        not_contains:     function(v){ return '*'+v+'*'; },
        less:             function(v){ return {'lt': v}; },
        less_or_equal:    function(v){ return {'lte': v}; },
        greater:          function(v){ return {'gt': v}; },
        greater_or_equal: function(v){ return {'gte': v}; },
        between:          function(v){ return {'gte': v[0], 'lte': v[1]}; },
        not_between:      function(v){ return {'gte': v[0], 'lte': v[1]}; },
        in :              function(v){ return v.split(',').map(function(e) { return e.trim()}); },
        not_in :          function(v){ return v.split(',').map(function(e) { return e.trim()}); }
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
            var q_parts = {};
            q_parts.add = function (k, v) {
                if (this.hasOwnProperty(k)) { this[k].push(v) }
                else { this[k] = [v] }
            };

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

                var es_oper=getQueryDSLWord(rule)
                var es_key_val = {};
                if (ope.nb_inputs !== 0) {
                    var ivalue=mdb.call(that, get_value(rule));
                    es_key_val[rule.field] =  ivalue
                    part[es_oper] = es_key_val;
                }
                if (rule.operator=='is_null' || rule.operator=='is_not_null' ){
                    part[es_oper] = {'field': rule.field};
                }
                if (rule.operator=='is_empty' || rule.operator=='is_not_empty' ){
                    es_key_val[rule.field] = ""
                    part[es_oper] = es_key_val;
                }

                if (data.condition === 'OR' && not_operator(rule.operator)) {
                    return {'bool': {'must_not': [part]}}
                } else {
                    return part
                }
            }

            data.rules.forEach(function(rule) {

                var clause = getClauseWord(data.condition, rule.operator);
                var es_oper=getQueryDSLWord(rule)
                if (es_oper==='wildcard'){
                    if (rule.rules && rule.rules.length>0) {
                        q_parts.add(clause, parse(rule));
                    } else {
                        q_parts.add(clause, make_query(rule));
                    }
                }else{
                    if (rule.rules && rule.rules.length>0) {
                        parts.add(clause, parse(rule));
                    } else {
                        parts.add(clause, make_query(rule));
                    }
                }
            });
            function isEmpty(obj)
            {
                for (var name in obj)
                {
                    return false;
                }
                return true;
            };

            delete parts.add;
            delete q_parts.add;
            var result={}
            if (!isEmpty(parts)){
                result['filter']={'bool': parts}
            }
            if (!isEmpty(q_parts)){
                result['query']={'bool': q_parts}
            }
            return result

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

    if (rule.operator === 'begins_with' || rule.operator === 'ends_with' || rule.operator === 'contains' ||
        rule.operator === 'not_begins_with' || rule.operator === 'not_ends_with' || rule.operator === 'not_contains') {
        return 'wildcard';
    }

    if (rule.operator === 'is_null' || rule.operator === 'is_not_null') {
        return 'missing';
    }
    if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') {
        return 'term';
    }

    if (rule.operator === 'in') {
        return 'terms';
    }

    else {
        return 'range';
    }
}

function not_operator(operator) {
    //return operator === 'not_equal';
    return (operator === 'not_equal'|| operator === 'not_begins_with' ||
            operator === 'not_ends_with' || operator === 'not_contains' ||
            operator === 'not_between' || operator === 'not_in' ||
            operator === 'is_not_null' || operator==='is_not_empty')
}

    /**
 * Get the right type of clause in the bool query
 */
function getClauseWord(condition, operator) {
    if (condition === 'AND' && !not_operator(operator)) { return 'must' }
    if (condition === 'AND' && not_operator(operator)) { return 'must_not' }
    if (condition === 'OR') { return 'should' }
}

}));