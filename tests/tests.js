var basic_filters = [
    {
        id: 'name',
        label: 'Name',
        type: 'string'
    },{
        id: 'price',
        label: 'Price',
        type: 'double',
        validation: {
            min: 0,
            step: 0.01
        },
        description: 'Lorem ipsum sit amet'
    },{
        id: 'score',
        label: 'score',
        type: 'integer',
        validation: {
            min: -1000,
            step: 1
        },
    },
];

function transform_me(s) {
    return s.toUpperCase();
}

$(function() {
    var $b = $('#builder');

    QUnit.module('core', {
        afterEach: function () {
            $b.queryBuilder('destroy');
        }
    });

    QUnit.test("Empty builder", function (assert) {

        assert.expect(3);

        $b.queryBuilder({
            filters: basic_filters
        });
        $('#builder_rule_0 [data-delete]').click();

        $b.on('validationError.queryBuilder', function (e, node, error, value) {
            assert.equal(
                error[0],
                'empty_group',
                'Should throw "empty_group" error'
            );
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {},
            'Should return empty object'
        );

        $b.queryBuilder('setOptions', {
            allow_empty: true
        });

        assert.deepEqual(
            $b.queryBuilder('getRules'),
            {condition: 'AND', rules: []},
            'Should return object with no rules'
        );
    });
});

$(function() {
    var $b = $('#builder');

    QUnit.module('operator', {
        afterEach: function () {
            $b.queryBuilder('destroy');
        }
    });

    QUnit.test("Equal", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'price', field: 'price', operator: 'equal', value: 10}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[{"term":{"price":"10"}}]}},
            'Should build a term query'
        );

    });

    QUnit.test("Wildcard", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'equal', value: "*gmail*"}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[{"wildcard":{"name":"*gmail*"}}]}},
            'Should build a wildcard query'
        );

    });


    QUnit.test("Not equal", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'price', field: 'price', operator: 'not_equal', value: 10}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must_not":[{"term":{"price":"10"}}]}},
            'Should build a must_not term query'
        );

    });

    QUnit.test("Less", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [
                    {id: 'price', field: 'price', operator: 'less', value: 10},
                    {id: 'price', field: 'price', operator: 'less_or_equal', value: 10}
                ]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[
                {"range":{"price":{"lt":"10"}}},
                {"range":{"price":{"lte":"10"}}}
            ]}},
            'Should build a range query'
        );

    });

    QUnit.test("Greater", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [
                    {id: 'price', field: 'price', operator: 'greater', value: 10},
                    {id: 'price', field: 'price', operator: 'greater_or_equal', value: 10}
                ]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[
                {"range":{"price":{"gt":"10"}}},
                {"range":{"price":{"gte":"10"}}}
            ]}},
            'Should build a range query'
        );

    });

    QUnit.test("Between", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'price', field: 'price', operator: 'between', value: [10,100]}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[ {"range":{"price":{"gte":"10", "lte":"100"}}} ]}},
            'Should build a range query'
        );

    });

    QUnit.test("In", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'in', value: "paul, mary"}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[ {"terms":{"name":["paul","mary"]}}]}},
            'Should build a range query'
        );

    });


    QUnit.test("Not in", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'not_in', value: "paul, mary"}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must_not":[ {"terms":{"name":["paul","mary"]}}]}},
            'Should build a range query'
        );

    });

    QUnit.test("Is null", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'is_null'}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must_not":[ {"exists":{"field":"name"}}]}},
            'Should build a must-not-exists query'
        );

    });

    QUnit.test("Is not null", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'is_not_null'}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[ {"exists":{"field":"name"}}]}},
            'Should build a must-exists query'
        );

    });

    QUnit.test("OR condition and null op", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'OR',
                rules: [
                    {id: 'name', field: 'name', operator: 'is_not_null'},
                    {id: 'price', field: 'price', operator: 'is_null'}
                ]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"should":[
                {"exists":{"field":"name"}},
                {"bool":{"must_not": [{"exists": {"field":"price"}}]}}
            ]}},
            'Should build a should query with a bool subquery'
        );

    });

    QUnit.test("SQSBuilder", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'contains', value: "*gmail*"}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESQueryStringQuery'),
            "name:*gmail*",
            'Should build a normal QueryStringQuery'
        );

    });

    QUnit.test("SQSGrouping", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'contains', value: "*gmail*"},
                {id: 'score', field: 'score', operator: 'between', value: [5,6]}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESQueryStringQuery'),
            "name:*gmail* AND score:[5 TO 6]",
            'Should build a AND group QueryStringQuery'
        );

    });

    QUnit.test("SQSExists", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'OR',
                rules: [{id: 'name', field: 'name', operator: 'is_null', value: "*gmail*"},
                {id: 'score', field: 'score', operator: 'is_not_null'}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESQueryStringQuery'),
            "_missing_:name OR _exists_:score",
            'Should build a QueryStringQuery to check if a field value is not null or another is null'
        );

    });

    QUnit.test("SQSNested", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [
                    {id: 'price', field: 'price', operator: 'between', value: [0,15]},
                    {condition: 'OR', rules: [
                        {id: 'name', field: 'name', operator: 'contains', value: 'handy'},
                        {id: 'score', field: 'score', operator: 'between', value: [-1000,5]}
                    ]}
                ]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESQueryStringQuery'),
            "price:[0 TO 15] AND (name:handy OR score:[-1000 TO 5])",
            'Should build a SQS query with a nested SQS sub query'
        );

    });
});

$(function() {
    var $b = $('#builder');

    QUnit.module('conditions', {
        afterEach: function () {
            $b.queryBuilder('destroy');
        }
    });

    QUnit.test("Nested", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [
                    {id: 'price', field: 'price', operator: 'equal', value: 10},
                    {condition: 'OR', rules: [
                        {id: 'name', field: 'name', operator: 'equal', value: 'paul'},
                        {id: 'name', field: 'name', operator: 'equal', value: 'mary'}
                    ]}
                ]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must": [
                {"term": {"price": "10"}},
                {"bool": {"should" : [
                    {"term": {"name": "paul"}},
                    {"term": {"name": "mary"}}
                ]}}
            ]}},
            'Should build a bool query with a nested bool sub query'
        );

    });

    QUnit.test("OR", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'OR',
                rules: [
                    {id: 'price', field: 'price', operator: 'equal', value: 10},
                    {id: 'price', field: 'price', operator: 'equal', value: 100},
                    {id: 'name', field: 'name', operator: 'not_equal', value: 'paul'}
                ]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"should": [
                {"term": {"price": "10"}},
                {"term": {"price": "100"}},
                {"bool": {"must_not" : [ {"term": {"name": "paul"}}]}}
            ]}},
            'Should build a query with should conditions and a sub query to handle not_equal operator'
        );

    });

    QUnit.test("Transform", function (assert) {

        $b.queryBuilder({
            filters: basic_filters,
            rules: {
                condition: 'AND',
                rules: [{id: 'name', field: 'name', operator: 'equal', value: 'paul', data: {transform: 'transform_me'}}]
            }
        });

        assert.deepEqual(
            $b.queryBuilder('getESBool'),
            {"bool": {"must":[{"term":{"name":"PAUL"}}]}},
            'Should build a term query and value is capitalized'
        );

    });

});
