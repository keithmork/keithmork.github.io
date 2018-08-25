var stats = {
    type: "GROUP",
name: "Global Information",
path: "",
pathFormatted: "group_missing-name-b06d1",
stats: {
    "name": "Global Information",
    "numberOfRequests": {
        "total": "250000",
        "ok": "250000",
        "ko": "0"
    },
    "minResponseTime": {
        "total": "0",
        "ok": "0",
        "ko": "-"
    },
    "maxResponseTime": {
        "total": "51010",
        "ok": "51010",
        "ko": "-"
    },
    "meanResponseTime": {
        "total": "20002",
        "ok": "20002",
        "ko": "-"
    },
    "standardDeviation": {
        "total": "24495",
        "ok": "24495",
        "ko": "-"
    },
    "percentiles1": {
        "total": "2",
        "ok": "2",
        "ko": "-"
    },
    "percentiles2": {
        "total": "50002",
        "ok": "50002",
        "ko": "-"
    },
    "percentiles3": {
        "total": "50008",
        "ok": "50008",
        "ko": "-"
    },
    "percentiles4": {
        "total": "50060",
        "ok": "50060",
        "ko": "-"
    },
    "group1": {
        "name": "t < 200 ms",
        "count": 149999,
        "percentage": 60
    },
    "group2": {
        "name": "200 ms < t < 1000 ms",
        "count": 0,
        "percentage": 0
    },
    "group3": {
        "name": "t > 1000 ms",
        "count": 100001,
        "percentage": 40
    },
    "group4": {
        "name": "failed",
        "count": 0,
        "percentage": 0
    },
    "meanNumberOfRequestsPerSecond": {
        "total": "996.016",
        "ok": "996.016",
        "ko": "-"
    }
},
contents: {
"req_benchmark-07978": {
        type: "REQUEST",
        name: "benchmark",
path: "benchmark",
pathFormatted: "req_benchmark-07978",
stats: {
    "name": "benchmark",
    "numberOfRequests": {
        "total": "250000",
        "ok": "250000",
        "ko": "0"
    },
    "minResponseTime": {
        "total": "0",
        "ok": "0",
        "ko": "-"
    },
    "maxResponseTime": {
        "total": "51010",
        "ok": "51010",
        "ko": "-"
    },
    "meanResponseTime": {
        "total": "20002",
        "ok": "20002",
        "ko": "-"
    },
    "standardDeviation": {
        "total": "24495",
        "ok": "24495",
        "ko": "-"
    },
    "percentiles1": {
        "total": "2",
        "ok": "2",
        "ko": "-"
    },
    "percentiles2": {
        "total": "50002",
        "ok": "50002",
        "ko": "-"
    },
    "percentiles3": {
        "total": "50008",
        "ok": "50008",
        "ko": "-"
    },
    "percentiles4": {
        "total": "50060",
        "ok": "50060",
        "ko": "-"
    },
    "group1": {
        "name": "t < 200 ms",
        "count": 149999,
        "percentage": 60
    },
    "group2": {
        "name": "200 ms < t < 1000 ms",
        "count": 0,
        "percentage": 0
    },
    "group3": {
        "name": "t > 1000 ms",
        "count": 100001,
        "percentage": 40
    },
    "group4": {
        "name": "failed",
        "count": 0,
        "percentage": 0
    },
    "meanNumberOfRequestsPerSecond": {
        "total": "996.016",
        "ok": "996.016",
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
