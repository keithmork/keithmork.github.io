var stats = {
    type: "GROUP",
name: "Global Information",
path: "",
pathFormatted: "group_missing-name-b06d1",
stats: {
    "name": "Global Information",
    "numberOfRequests": {
        "total": "2756446",
        "ok": "2756446",
        "ko": "0"
    },
    "minResponseTime": {
        "total": "0",
        "ok": "0",
        "ko": "-"
    },
    "maxResponseTime": {
        "total": "50038",
        "ok": "50038",
        "ko": "-"
    },
    "meanResponseTime": {
        "total": "9",
        "ok": "9",
        "ko": "-"
    },
    "standardDeviation": {
        "total": "426",
        "ok": "426",
        "ko": "-"
    },
    "percentiles1": {
        "total": "5",
        "ok": "5",
        "ko": "-"
    },
    "percentiles2": {
        "total": "9",
        "ok": "9",
        "ko": "-"
    },
    "percentiles3": {
        "total": "11",
        "ok": "11",
        "ko": "-"
    },
    "percentiles4": {
        "total": "63",
        "ok": "63",
        "ko": "-"
    },
    "group1": {
        "name": "t < 200 ms",
        "count": 2756246,
        "percentage": 100
    },
    "group2": {
        "name": "200 ms < t < 1000 ms",
        "count": 0,
        "percentage": 0
    },
    "group3": {
        "name": "t > 1000 ms",
        "count": 200,
        "percentage": 0
    },
    "group4": {
        "name": "failed",
        "count": 0,
        "percentage": 0
    },
    "meanNumberOfRequestsPerSecond": {
        "total": "10938.278",
        "ok": "10938.278",
        "ko": "-"
    }
},
contents: {
"req_-api-json-coord-13f75": {
        type: "REQUEST",
        name: "/api/json/coordinatedOmission",
path: "/api/json/coordinatedOmission",
pathFormatted: "req_-api-json-coord-13f75",
stats: {
    "name": "/api/json/coordinatedOmission",
    "numberOfRequests": {
        "total": "2756446",
        "ok": "2756446",
        "ko": "0"
    },
    "minResponseTime": {
        "total": "0",
        "ok": "0",
        "ko": "-"
    },
    "maxResponseTime": {
        "total": "50038",
        "ok": "50038",
        "ko": "-"
    },
    "meanResponseTime": {
        "total": "9",
        "ok": "9",
        "ko": "-"
    },
    "standardDeviation": {
        "total": "426",
        "ok": "426",
        "ko": "-"
    },
    "percentiles1": {
        "total": "5",
        "ok": "5",
        "ko": "-"
    },
    "percentiles2": {
        "total": "9",
        "ok": "9",
        "ko": "-"
    },
    "percentiles3": {
        "total": "11",
        "ok": "11",
        "ko": "-"
    },
    "percentiles4": {
        "total": "63",
        "ok": "63",
        "ko": "-"
    },
    "group1": {
        "name": "t < 200 ms",
        "count": 2756246,
        "percentage": 100
    },
    "group2": {
        "name": "200 ms < t < 1000 ms",
        "count": 0,
        "percentage": 0
    },
    "group3": {
        "name": "t > 1000 ms",
        "count": 200,
        "percentage": 0
    },
    "group4": {
        "name": "failed",
        "count": 0,
        "percentage": 0
    },
    "meanNumberOfRequestsPerSecond": {
        "total": "10938.278",
        "ok": "10938.278",
        "ko": "-"
    }
}
    }
}

}

function fillStats(stat){
    $("#numberOfRequests").append(stat.numberOfRequests.total);
    $("#numberOfRequestsOK").append(stat.numberOfRequests.ok);
    $("#numberOfRequestsKO").append(stat.numberOfRequests.ko);

    $("#minResponseTime").append(stat.minResponseTime.total);
    $("#minResponseTimeOK").append(stat.minResponseTime.ok);
    $("#minResponseTimeKO").append(stat.minResponseTime.ko);

    $("#maxResponseTime").append(stat.maxResponseTime.total);
    $("#maxResponseTimeOK").append(stat.maxResponseTime.ok);
    $("#maxResponseTimeKO").append(stat.maxResponseTime.ko);

    $("#meanResponseTime").append(stat.meanResponseTime.total);
    $("#meanResponseTimeOK").append(stat.meanResponseTime.ok);
    $("#meanResponseTimeKO").append(stat.meanResponseTime.ko);

    $("#standardDeviation").append(stat.standardDeviation.total);
    $("#standardDeviationOK").append(stat.standardDeviation.ok);
    $("#standardDeviationKO").append(stat.standardDeviation.ko);

    $("#percentiles1").append(stat.percentiles1.total);
    $("#percentiles1OK").append(stat.percentiles1.ok);
    $("#percentiles1KO").append(stat.percentiles1.ko);

    $("#percentiles2").append(stat.percentiles2.total);
    $("#percentiles2OK").append(stat.percentiles2.ok);
    $("#percentiles2KO").append(stat.percentiles2.ko);

    $("#percentiles3").append(stat.percentiles3.total);
    $("#percentiles3OK").append(stat.percentiles3.ok);
    $("#percentiles3KO").append(stat.percentiles3.ko);

    $("#percentiles4").append(stat.percentiles4.total);
    $("#percentiles4OK").append(stat.percentiles4.ok);
    $("#percentiles4KO").append(stat.percentiles4.ko);

    $("#meanNumberOfRequestsPerSecond").append(stat.meanNumberOfRequestsPerSecond.total);
    $("#meanNumberOfRequestsPerSecondOK").append(stat.meanNumberOfRequestsPerSecond.ok);
    $("#meanNumberOfRequestsPerSecondKO").append(stat.meanNumberOfRequestsPerSecond.ko);
}
