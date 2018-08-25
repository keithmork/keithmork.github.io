/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
$(document).ready(function() {

    $(".click-title").mouseenter( function(    e){
        e.preventDefault();
        this.style.cursor="pointer";
    });
    $(".click-title").mousedown( function(event){
        event.preventDefault();
    });

    // Ugly code while this script is shared among several pages
    try{
        refreshHitsPerSecond(true);
    } catch(e){}
    try{
        refreshResponseTimeOverTime(true);
    } catch(e){}
    try{
        refreshResponseTimePercentiles();
    } catch(e){}
    $(".portlet-header").css("cursor", "auto");
});

var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

// Fixes time stamps
function fixTimeStamps(series, offset){
    $.each(series, function(index, item) {
        $.each(item.data, function(index, coord) {
            coord[0] += offset;
        });
    });
}

// Check if the specified jquery object is a graph
function isGraph(object){
    return object.data('plot') !== undefined;
}

/**
 * Export graph to a PNG
 */
function exportToPNG(graphName, target) {
    var plot = $("#"+graphName).data('plot');
    var flotCanvas = plot.getCanvas();
    var image = flotCanvas.toDataURL();
    image = image.replace("image/png", "image/octet-stream");
    
    var downloadAttrSupported = ("download" in document.createElement("a"));
    if(downloadAttrSupported === true) {
        target.download = graphName + ".png";
        target.href = image;
    }
    else {
        document.location.href = image;
    }
    
}

// Override the specified graph options to fit the requirements of an overview
function prepareOverviewOptions(graphOptions){
    var overviewOptions = {
        series: {
            shadowSize: 0,
            lines: {
                lineWidth: 1
            },
            points: {
                // Show points on overview only when linked graph does not show
                // lines
                show: getProperty('series.lines.show', graphOptions) == false,
                radius : 1
            }
        },
        xaxis: {
            ticks: 2,
            axisLabel: null
        },
        yaxis: {
            ticks: 2,
            axisLabel: null
        },
        legend: {
            show: false,
            container: null
        },
        grid: {
            hoverable: false
        },
        tooltip: false
    };
    return $.extend(true, {}, graphOptions, overviewOptions);
}

// Force axes boundaries using graph extra options
function prepareOptions(options, data) {
    options.canvas = true;
    var extraOptions = data.extraOptions;
    if(extraOptions !== undefined){
        var xOffset = options.xaxis.mode === "time" ? 0 : 0;
        var yOffset = options.yaxis.mode === "time" ? 0 : 0;

        if(!isNaN(extraOptions.minX))
        	options.xaxis.min = parseFloat(extraOptions.minX) + xOffset;
        
        if(!isNaN(extraOptions.maxX))
        	options.xaxis.max = parseFloat(extraOptions.maxX) + xOffset;
        
        if(!isNaN(extraOptions.minY))
        	options.yaxis.min = parseFloat(extraOptions.minY) + yOffset;
        
        if(!isNaN(extraOptions.maxY))
        	options.yaxis.max = parseFloat(extraOptions.maxY) + yOffset;
    }
}

// Filter, mark series and sort data
/**
 * @param data
 * @param noMatchColor if defined and true, series.color are not matched with index
 */
function prepareSeries(data, noMatchColor){
    var result = data.result;

    // Keep only series when needed
    if(seriesFilter && (!filtersOnlySampleSeries || result.supportsControllersDiscrimination)){
        // Insensitive case matching
        var regexp = new RegExp(seriesFilter, 'i');
        result.series = $.grep(result.series, function(series, index){
            return regexp.test(series.label);
        });
    }

    // Keep only controllers series when supported and needed
    if(result.supportsControllersDiscrimination && showControllersOnly){
        result.series = $.grep(result.series, function(series, index){
            return series.isController;
        });
    }

    // Sort data and mark series
    $.each(result.series, function(index, series) {
        series.data.sort(compareByXCoordinate);
        if(!(noMatchColor && noMatchColor===true)) {
	        series.color = index;
	    }
    });
}

// Set the zoom on the specified plot object
function zoomPlot(plot, xmin, xmax, ymin, ymax){
    var axes = plot.getAxes();
    // Override axes min and max options
    $.extend(true, axes, {
        xaxis: {
            options : { min: xmin, max: xmax }
        },
        yaxis: {
            options : { min: ymin, max: ymax }
        }
    });

    // Redraw the plot
    plot.setupGrid();
    plot.draw();
}

// Prepares DOM items to add zoom function on the specified graph
function setGraphZoomable(graphSelector, overviewSelector){
    var graph = $(graphSelector);
    var overview = $(overviewSelector);

    // Ignore mouse down event
    graph.bind("mousedown", function() { return false; });
    overview.bind("mousedown", function() { return false; });

    // Zoom on selection
    graph.bind("plotselected", function (event, ranges) {
        // clamp the zooming to prevent infinite zoom
        if (ranges.xaxis.to - ranges.xaxis.from < 0.00001) {
            ranges.xaxis.to = ranges.xaxis.from + 0.00001;
        }
        if (ranges.yaxis.to - ranges.yaxis.from < 0.00001) {
            ranges.yaxis.to = ranges.yaxis.from + 0.00001;
        }

        // Do the zooming
        var plot = graph.data('plot');
        zoomPlot(plot, ranges.xaxis.from, ranges.xaxis.to, ranges.yaxis.from, ranges.yaxis.to);
        plot.clearSelection();

        // Synchronize overview selection
        overview.data('plot').setSelection(ranges, true);
    });

    // Zoom linked graph on overview selection
    overview.bind("plotselected", function (event, ranges) {
        graph.data('plot').setSelection(ranges);
    });

    // Reset linked graph zoom when reseting overview selection
    overview.bind("plotunselected", function () {
        var overviewAxes = overview.data('plot').getAxes();
        zoomPlot(graph.data('plot'), overviewAxes.xaxis.min, overviewAxes.xaxis.max, overviewAxes.yaxis.min, overviewAxes.yaxis.max);
    });
}

var responseTimePercentilesInfos = {
        data: {"result": {"minY": 0.0, "minX": 0.0, "maxY": 50054.0, "series": [{"data": [[0.0, 0.0], [0.1, 2.0], [0.2, 2.0], [0.3, 3.0], [0.4, 3.0], [0.5, 3.0], [0.6, 3.0], [0.7, 3.0], [0.8, 3.0], [0.9, 3.0], [1.0, 3.0], [1.1, 3.0], [1.2, 3.0], [1.3, 3.0], [1.4, 3.0], [1.5, 3.0], [1.6, 3.0], [1.7, 3.0], [1.8, 3.0], [1.9, 3.0], [2.0, 3.0], [2.1, 3.0], [2.2, 3.0], [2.3, 3.0], [2.4, 3.0], [2.5, 3.0], [2.6, 3.0], [2.7, 3.0], [2.8, 3.0], [2.9, 3.0], [3.0, 3.0], [3.1, 3.0], [3.2, 3.0], [3.3, 3.0], [3.4, 3.0], [3.5, 3.0], [3.6, 3.0], [3.7, 3.0], [3.8, 3.0], [3.9, 3.0], [4.0, 3.0], [4.1, 3.0], [4.2, 3.0], [4.3, 3.0], [4.4, 3.0], [4.5, 3.0], [4.6, 3.0], [4.7, 3.0], [4.8, 3.0], [4.9, 3.0], [5.0, 3.0], [5.1, 3.0], [5.2, 3.0], [5.3, 3.0], [5.4, 3.0], [5.5, 3.0], [5.6, 3.0], [5.7, 3.0], [5.8, 3.0], [5.9, 3.0], [6.0, 3.0], [6.1, 4.0], [6.2, 4.0], [6.3, 4.0], [6.4, 4.0], [6.5, 4.0], [6.6, 4.0], [6.7, 4.0], [6.8, 4.0], [6.9, 4.0], [7.0, 4.0], [7.1, 4.0], [7.2, 4.0], [7.3, 4.0], [7.4, 4.0], [7.5, 4.0], [7.6, 4.0], [7.7, 4.0], [7.8, 4.0], [7.9, 4.0], [8.0, 4.0], [8.1, 4.0], [8.2, 4.0], [8.3, 4.0], [8.4, 4.0], [8.5, 4.0], [8.6, 4.0], [8.7, 4.0], [8.8, 4.0], [8.9, 4.0], [9.0, 4.0], [9.1, 4.0], [9.2, 4.0], [9.3, 4.0], [9.4, 4.0], [9.5, 4.0], [9.6, 4.0], [9.7, 4.0], [9.8, 4.0], [9.9, 4.0], [10.0, 4.0], [10.1, 4.0], [10.2, 4.0], [10.3, 4.0], [10.4, 4.0], [10.5, 4.0], [10.6, 4.0], [10.7, 4.0], [10.8, 4.0], [10.9, 4.0], [11.0, 4.0], [11.1, 4.0], [11.2, 4.0], [11.3, 4.0], [11.4, 4.0], [11.5, 4.0], [11.6, 4.0], [11.7, 4.0], [11.8, 4.0], [11.9, 4.0], [12.0, 4.0], [12.1, 4.0], [12.2, 4.0], [12.3, 4.0], [12.4, 4.0], [12.5, 4.0], [12.6, 4.0], [12.7, 4.0], [12.8, 4.0], [12.9, 4.0], [13.0, 4.0], [13.1, 4.0], [13.2, 4.0], [13.3, 4.0], [13.4, 4.0], [13.5, 4.0], [13.6, 4.0], [13.7, 4.0], [13.8, 4.0], [13.9, 4.0], [14.0, 4.0], [14.1, 4.0], [14.2, 4.0], [14.3, 4.0], [14.4, 4.0], [14.5, 4.0], [14.6, 4.0], [14.7, 4.0], [14.8, 4.0], [14.9, 4.0], [15.0, 4.0], [15.1, 4.0], [15.2, 4.0], [15.3, 4.0], [15.4, 4.0], [15.5, 4.0], [15.6, 4.0], [15.7, 4.0], [15.8, 4.0], [15.9, 4.0], [16.0, 4.0], [16.1, 4.0], [16.2, 4.0], [16.3, 4.0], [16.4, 4.0], [16.5, 4.0], [16.6, 4.0], [16.7, 4.0], [16.8, 4.0], [16.9, 4.0], [17.0, 4.0], [17.1, 4.0], [17.2, 4.0], [17.3, 4.0], [17.4, 4.0], [17.5, 4.0], [17.6, 4.0], [17.7, 4.0], [17.8, 4.0], [17.9, 4.0], [18.0, 4.0], [18.1, 4.0], [18.2, 4.0], [18.3, 4.0], [18.4, 4.0], [18.5, 4.0], [18.6, 4.0], [18.7, 4.0], [18.8, 4.0], [18.9, 4.0], [19.0, 4.0], [19.1, 4.0], [19.2, 4.0], [19.3, 4.0], [19.4, 4.0], [19.5, 4.0], [19.6, 4.0], [19.7, 4.0], [19.8, 4.0], [19.9, 4.0], [20.0, 4.0], [20.1, 4.0], [20.2, 4.0], [20.3, 4.0], [20.4, 4.0], [20.5, 4.0], [20.6, 4.0], [20.7, 4.0], [20.8, 4.0], [20.9, 4.0], [21.0, 4.0], [21.1, 4.0], [21.2, 4.0], [21.3, 4.0], [21.4, 4.0], [21.5, 4.0], [21.6, 4.0], [21.7, 4.0], [21.8, 4.0], [21.9, 4.0], [22.0, 4.0], [22.1, 4.0], [22.2, 4.0], [22.3, 4.0], [22.4, 4.0], [22.5, 4.0], [22.6, 4.0], [22.7, 4.0], [22.8, 4.0], [22.9, 4.0], [23.0, 4.0], [23.1, 4.0], [23.2, 4.0], [23.3, 4.0], [23.4, 4.0], [23.5, 4.0], [23.6, 4.0], [23.7, 4.0], [23.8, 4.0], [23.9, 5.0], [24.0, 5.0], [24.1, 5.0], [24.2, 5.0], [24.3, 5.0], [24.4, 5.0], [24.5, 5.0], [24.6, 5.0], [24.7, 5.0], [24.8, 5.0], [24.9, 5.0], [25.0, 5.0], [25.1, 5.0], [25.2, 5.0], [25.3, 5.0], [25.4, 5.0], [25.5, 5.0], [25.6, 5.0], [25.7, 5.0], [25.8, 5.0], [25.9, 5.0], [26.0, 5.0], [26.1, 5.0], [26.2, 5.0], [26.3, 5.0], [26.4, 5.0], [26.5, 5.0], [26.6, 5.0], [26.7, 5.0], [26.8, 5.0], [26.9, 5.0], [27.0, 5.0], [27.1, 5.0], [27.2, 5.0], [27.3, 5.0], [27.4, 5.0], [27.5, 5.0], [27.6, 5.0], [27.7, 5.0], [27.8, 5.0], [27.9, 5.0], [28.0, 5.0], [28.1, 5.0], [28.2, 5.0], [28.3, 5.0], [28.4, 5.0], [28.5, 5.0], [28.6, 5.0], [28.7, 5.0], [28.8, 5.0], [28.9, 5.0], [29.0, 5.0], [29.1, 5.0], [29.2, 5.0], [29.3, 5.0], [29.4, 5.0], [29.5, 5.0], [29.6, 5.0], [29.7, 5.0], [29.8, 5.0], [29.9, 5.0], [30.0, 5.0], [30.1, 5.0], [30.2, 5.0], [30.3, 5.0], [30.4, 5.0], [30.5, 5.0], [30.6, 5.0], [30.7, 5.0], [30.8, 5.0], [30.9, 5.0], [31.0, 5.0], [31.1, 5.0], [31.2, 5.0], [31.3, 5.0], [31.4, 5.0], [31.5, 5.0], [31.6, 5.0], [31.7, 5.0], [31.8, 5.0], [31.9, 5.0], [32.0, 5.0], [32.1, 5.0], [32.2, 5.0], [32.3, 5.0], [32.4, 5.0], [32.5, 5.0], [32.6, 5.0], [32.7, 5.0], [32.8, 5.0], [32.9, 5.0], [33.0, 5.0], [33.1, 5.0], [33.2, 5.0], [33.3, 5.0], [33.4, 5.0], [33.5, 5.0], [33.6, 5.0], [33.7, 5.0], [33.8, 5.0], [33.9, 5.0], [34.0, 5.0], [34.1, 5.0], [34.2, 5.0], [34.3, 5.0], [34.4, 5.0], [34.5, 5.0], [34.6, 5.0], [34.7, 5.0], [34.8, 5.0], [34.9, 5.0], [35.0, 5.0], [35.1, 5.0], [35.2, 5.0], [35.3, 5.0], [35.4, 5.0], [35.5, 5.0], [35.6, 5.0], [35.7, 5.0], [35.8, 5.0], [35.9, 5.0], [36.0, 5.0], [36.1, 5.0], [36.2, 5.0], [36.3, 5.0], [36.4, 5.0], [36.5, 5.0], [36.6, 5.0], [36.7, 5.0], [36.8, 5.0], [36.9, 5.0], [37.0, 5.0], [37.1, 5.0], [37.2, 5.0], [37.3, 5.0], [37.4, 5.0], [37.5, 5.0], [37.6, 5.0], [37.7, 5.0], [37.8, 5.0], [37.9, 5.0], [38.0, 5.0], [38.1, 5.0], [38.2, 5.0], [38.3, 5.0], [38.4, 5.0], [38.5, 5.0], [38.6, 5.0], [38.7, 5.0], [38.8, 5.0], [38.9, 5.0], [39.0, 5.0], [39.1, 5.0], [39.2, 5.0], [39.3, 5.0], [39.4, 5.0], [39.5, 5.0], [39.6, 5.0], [39.7, 5.0], [39.8, 5.0], [39.9, 5.0], [40.0, 5.0], [40.1, 5.0], [40.2, 5.0], [40.3, 5.0], [40.4, 5.0], [40.5, 5.0], [40.6, 5.0], [40.7, 5.0], [40.8, 5.0], [40.9, 5.0], [41.0, 5.0], [41.1, 5.0], [41.2, 5.0], [41.3, 5.0], [41.4, 5.0], [41.5, 5.0], [41.6, 5.0], [41.7, 5.0], [41.8, 5.0], [41.9, 5.0], [42.0, 5.0], [42.1, 5.0], [42.2, 5.0], [42.3, 5.0], [42.4, 5.0], [42.5, 5.0], [42.6, 5.0], [42.7, 5.0], [42.8, 5.0], [42.9, 5.0], [43.0, 5.0], [43.1, 5.0], [43.2, 5.0], [43.3, 5.0], [43.4, 5.0], [43.5, 5.0], [43.6, 5.0], [43.7, 5.0], [43.8, 5.0], [43.9, 5.0], [44.0, 5.0], [44.1, 5.0], [44.2, 5.0], [44.3, 5.0], [44.4, 5.0], [44.5, 5.0], [44.6, 5.0], [44.7, 5.0], [44.8, 5.0], [44.9, 5.0], [45.0, 5.0], [45.1, 5.0], [45.2, 5.0], [45.3, 5.0], [45.4, 5.0], [45.5, 5.0], [45.6, 5.0], [45.7, 5.0], [45.8, 5.0], [45.9, 5.0], [46.0, 5.0], [46.1, 5.0], [46.2, 5.0], [46.3, 5.0], [46.4, 5.0], [46.5, 5.0], [46.6, 5.0], [46.7, 5.0], [46.8, 5.0], [46.9, 5.0], [47.0, 5.0], [47.1, 5.0], [47.2, 5.0], [47.3, 5.0], [47.4, 5.0], [47.5, 5.0], [47.6, 5.0], [47.7, 5.0], [47.8, 5.0], [47.9, 5.0], [48.0, 5.0], [48.1, 5.0], [48.2, 5.0], [48.3, 5.0], [48.4, 5.0], [48.5, 5.0], [48.6, 5.0], [48.7, 5.0], [48.8, 5.0], [48.9, 5.0], [49.0, 5.0], [49.1, 5.0], [49.2, 5.0], [49.3, 5.0], [49.4, 5.0], [49.5, 5.0], [49.6, 5.0], [49.7, 5.0], [49.8, 5.0], [49.9, 5.0], [50.0, 5.0], [50.1, 5.0], [50.2, 5.0], [50.3, 5.0], [50.4, 6.0], [50.5, 6.0], [50.6, 6.0], [50.7, 6.0], [50.8, 6.0], [50.9, 6.0], [51.0, 6.0], [51.1, 6.0], [51.2, 6.0], [51.3, 6.0], [51.4, 6.0], [51.5, 6.0], [51.6, 6.0], [51.7, 6.0], [51.8, 6.0], [51.9, 6.0], [52.0, 6.0], [52.1, 6.0], [52.2, 6.0], [52.3, 6.0], [52.4, 6.0], [52.5, 6.0], [52.6, 6.0], [52.7, 6.0], [52.8, 6.0], [52.9, 6.0], [53.0, 6.0], [53.1, 6.0], [53.2, 6.0], [53.3, 6.0], [53.4, 6.0], [53.5, 6.0], [53.6, 6.0], [53.7, 6.0], [53.8, 6.0], [53.9, 6.0], [54.0, 6.0], [54.1, 6.0], [54.2, 6.0], [54.3, 6.0], [54.4, 6.0], [54.5, 6.0], [54.6, 6.0], [54.7, 6.0], [54.8, 6.0], [54.9, 6.0], [55.0, 6.0], [55.1, 6.0], [55.2, 6.0], [55.3, 6.0], [55.4, 6.0], [55.5, 6.0], [55.6, 6.0], [55.7, 6.0], [55.8, 6.0], [55.9, 6.0], [56.0, 6.0], [56.1, 6.0], [56.2, 6.0], [56.3, 6.0], [56.4, 6.0], [56.5, 6.0], [56.6, 6.0], [56.7, 6.0], [56.8, 6.0], [56.9, 6.0], [57.0, 6.0], [57.1, 6.0], [57.2, 6.0], [57.3, 6.0], [57.4, 6.0], [57.5, 6.0], [57.6, 6.0], [57.7, 6.0], [57.8, 6.0], [57.9, 6.0], [58.0, 6.0], [58.1, 6.0], [58.2, 6.0], [58.3, 6.0], [58.4, 6.0], [58.5, 6.0], [58.6, 6.0], [58.7, 6.0], [58.8, 6.0], [58.9, 6.0], [59.0, 6.0], [59.1, 6.0], [59.2, 6.0], [59.3, 6.0], [59.4, 6.0], [59.5, 6.0], [59.6, 6.0], [59.7, 6.0], [59.8, 6.0], [59.9, 6.0], [60.0, 6.0], [60.1, 6.0], [60.2, 6.0], [60.3, 6.0], [60.4, 6.0], [60.5, 6.0], [60.6, 6.0], [60.7, 6.0], [60.8, 6.0], [60.9, 6.0], [61.0, 6.0], [61.1, 6.0], [61.2, 6.0], [61.3, 6.0], [61.4, 6.0], [61.5, 6.0], [61.6, 6.0], [61.7, 6.0], [61.8, 6.0], [61.9, 6.0], [62.0, 6.0], [62.1, 6.0], [62.2, 6.0], [62.3, 6.0], [62.4, 6.0], [62.5, 6.0], [62.6, 6.0], [62.7, 6.0], [62.8, 6.0], [62.9, 6.0], [63.0, 6.0], [63.1, 6.0], [63.2, 6.0], [63.3, 6.0], [63.4, 6.0], [63.5, 6.0], [63.6, 6.0], [63.7, 6.0], [63.8, 6.0], [63.9, 6.0], [64.0, 6.0], [64.1, 6.0], [64.2, 6.0], [64.3, 6.0], [64.4, 6.0], [64.5, 6.0], [64.6, 6.0], [64.7, 6.0], [64.8, 6.0], [64.9, 6.0], [65.0, 6.0], [65.1, 6.0], [65.2, 6.0], [65.3, 6.0], [65.4, 6.0], [65.5, 6.0], [65.6, 6.0], [65.7, 6.0], [65.8, 6.0], [65.9, 6.0], [66.0, 6.0], [66.1, 6.0], [66.2, 6.0], [66.3, 6.0], [66.4, 6.0], [66.5, 6.0], [66.6, 6.0], [66.7, 6.0], [66.8, 6.0], [66.9, 6.0], [67.0, 6.0], [67.1, 6.0], [67.2, 6.0], [67.3, 6.0], [67.4, 6.0], [67.5, 6.0], [67.6, 6.0], [67.7, 6.0], [67.8, 6.0], [67.9, 6.0], [68.0, 6.0], [68.1, 6.0], [68.2, 6.0], [68.3, 6.0], [68.4, 6.0], [68.5, 6.0], [68.6, 6.0], [68.7, 6.0], [68.8, 6.0], [68.9, 6.0], [69.0, 6.0], [69.1, 6.0], [69.2, 6.0], [69.3, 6.0], [69.4, 6.0], [69.5, 6.0], [69.6, 6.0], [69.7, 6.0], [69.8, 6.0], [69.9, 6.0], [70.0, 6.0], [70.1, 6.0], [70.2, 6.0], [70.3, 6.0], [70.4, 6.0], [70.5, 6.0], [70.6, 6.0], [70.7, 6.0], [70.8, 6.0], [70.9, 6.0], [71.0, 6.0], [71.1, 6.0], [71.2, 6.0], [71.3, 6.0], [71.4, 6.0], [71.5, 6.0], [71.6, 6.0], [71.7, 6.0], [71.8, 6.0], [71.9, 6.0], [72.0, 6.0], [72.1, 6.0], [72.2, 6.0], [72.3, 6.0], [72.4, 6.0], [72.5, 6.0], [72.6, 6.0], [72.7, 6.0], [72.8, 6.0], [72.9, 6.0], [73.0, 6.0], [73.1, 6.0], [73.2, 6.0], [73.3, 6.0], [73.4, 6.0], [73.5, 6.0], [73.6, 6.0], [73.7, 6.0], [73.8, 6.0], [73.9, 6.0], [74.0, 6.0], [74.1, 6.0], [74.2, 6.0], [74.3, 6.0], [74.4, 6.0], [74.5, 7.0], [74.6, 7.0], [74.7, 7.0], [74.8, 7.0], [74.9, 7.0], [75.0, 7.0], [75.1, 7.0], [75.2, 7.0], [75.3, 7.0], [75.4, 7.0], [75.5, 7.0], [75.6, 7.0], [75.7, 7.0], [75.8, 7.0], [75.9, 7.0], [76.0, 7.0], [76.1, 7.0], [76.2, 7.0], [76.3, 7.0], [76.4, 7.0], [76.5, 7.0], [76.6, 7.0], [76.7, 7.0], [76.8, 7.0], [76.9, 7.0], [77.0, 7.0], [77.1, 7.0], [77.2, 7.0], [77.3, 7.0], [77.4, 7.0], [77.5, 7.0], [77.6, 7.0], [77.7, 7.0], [77.8, 7.0], [77.9, 7.0], [78.0, 7.0], [78.1, 7.0], [78.2, 7.0], [78.3, 7.0], [78.4, 7.0], [78.5, 7.0], [78.6, 7.0], [78.7, 7.0], [78.8, 7.0], [78.9, 7.0], [79.0, 7.0], [79.1, 7.0], [79.2, 7.0], [79.3, 7.0], [79.4, 7.0], [79.5, 7.0], [79.6, 7.0], [79.7, 7.0], [79.8, 7.0], [79.9, 7.0], [80.0, 7.0], [80.1, 7.0], [80.2, 7.0], [80.3, 7.0], [80.4, 7.0], [80.5, 7.0], [80.6, 7.0], [80.7, 7.0], [80.8, 7.0], [80.9, 7.0], [81.0, 7.0], [81.1, 7.0], [81.2, 7.0], [81.3, 7.0], [81.4, 7.0], [81.5, 7.0], [81.6, 7.0], [81.7, 7.0], [81.8, 7.0], [81.9, 7.0], [82.0, 7.0], [82.1, 7.0], [82.2, 7.0], [82.3, 7.0], [82.4, 7.0], [82.5, 7.0], [82.6, 7.0], [82.7, 7.0], [82.8, 7.0], [82.9, 7.0], [83.0, 7.0], [83.1, 7.0], [83.2, 7.0], [83.3, 7.0], [83.4, 7.0], [83.5, 7.0], [83.6, 7.0], [83.7, 7.0], [83.8, 8.0], [83.9, 8.0], [84.0, 8.0], [84.1, 8.0], [84.2, 8.0], [84.3, 8.0], [84.4, 8.0], [84.5, 8.0], [84.6, 8.0], [84.7, 8.0], [84.8, 8.0], [84.9, 8.0], [85.0, 8.0], [85.1, 8.0], [85.2, 8.0], [85.3, 8.0], [85.4, 8.0], [85.5, 8.0], [85.6, 8.0], [85.7, 8.0], [85.8, 8.0], [85.9, 8.0], [86.0, 8.0], [86.1, 8.0], [86.2, 8.0], [86.3, 8.0], [86.4, 8.0], [86.5, 8.0], [86.6, 8.0], [86.7, 8.0], [86.8, 8.0], [86.9, 8.0], [87.0, 8.0], [87.1, 8.0], [87.2, 8.0], [87.3, 8.0], [87.4, 8.0], [87.5, 8.0], [87.6, 8.0], [87.7, 8.0], [87.8, 8.0], [87.9, 8.0], [88.0, 8.0], [88.1, 8.0], [88.2, 8.0], [88.3, 8.0], [88.4, 8.0], [88.5, 8.0], [88.6, 8.0], [88.7, 8.0], [88.8, 8.0], [88.9, 8.0], [89.0, 8.0], [89.1, 8.0], [89.2, 8.0], [89.3, 8.0], [89.4, 8.0], [89.5, 8.0], [89.6, 8.0], [89.7, 8.0], [89.8, 8.0], [89.9, 8.0], [90.0, 8.0], [90.1, 8.0], [90.2, 8.0], [90.3, 8.0], [90.4, 8.0], [90.5, 8.0], [90.6, 8.0], [90.7, 8.0], [90.8, 8.0], [90.9, 8.0], [91.0, 8.0], [91.1, 8.0], [91.2, 8.0], [91.3, 8.0], [91.4, 8.0], [91.5, 8.0], [91.6, 8.0], [91.7, 8.0], [91.8, 8.0], [91.9, 8.0], [92.0, 8.0], [92.1, 8.0], [92.2, 8.0], [92.3, 8.0], [92.4, 8.0], [92.5, 8.0], [92.6, 9.0], [92.7, 9.0], [92.8, 9.0], [92.9, 9.0], [93.0, 9.0], [93.1, 9.0], [93.2, 9.0], [93.3, 9.0], [93.4, 9.0], [93.5, 9.0], [93.6, 9.0], [93.7, 9.0], [93.8, 9.0], [93.9, 9.0], [94.0, 9.0], [94.1, 9.0], [94.2, 9.0], [94.3, 9.0], [94.4, 9.0], [94.5, 9.0], [94.6, 9.0], [94.7, 9.0], [94.8, 9.0], [94.9, 9.0], [95.0, 9.0], [95.1, 9.0], [95.2, 9.0], [95.3, 9.0], [95.4, 9.0], [95.5, 9.0], [95.6, 9.0], [95.7, 9.0], [95.8, 9.0], [95.9, 9.0], [96.0, 9.0], [96.1, 9.0], [96.2, 9.0], [96.3, 9.0], [96.4, 9.0], [96.5, 9.0], [96.6, 9.0], [96.7, 9.0], [96.8, 9.0], [96.9, 9.0], [97.0, 9.0], [97.1, 9.0], [97.2, 9.0], [97.3, 9.0], [97.4, 9.0], [97.5, 9.0], [97.6, 9.0], [97.7, 9.0], [97.8, 9.0], [97.9, 9.0], [98.0, 9.0], [98.1, 9.0], [98.2, 9.0], [98.3, 9.0], [98.4, 9.0], [98.5, 10.0], [98.6, 10.0], [98.7, 10.0], [98.8, 10.0], [98.9, 10.0], [99.0, 10.0], [99.1, 10.0], [99.2, 10.0], [99.3, 10.0], [99.4, 10.0], [99.5, 10.0], [99.6, 11.0], [99.7, 12.0], [99.8, 13.0], [99.9, 15.0]], "isOverall": false, "label": "coordinatedOmission", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Response Time Percentiles"}},
        getOptions: function() {
            return {
                series: {
                    points: { show: false }
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentiles'
                },
                xaxis: {
                    tickDecimals: 1,
                    axisLabel: "Percentiles",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Percentile value in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : %x.2 percentile was %y ms"
                },
                selection: { mode: "xy" },
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentiles"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesPercentiles"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesPercentiles"), dataset, prepareOverviewOptions(options));
        }
};

// Response times percentiles
function refreshResponseTimePercentiles() {
    var infos = responseTimePercentilesInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimesPercentiles"))){
        infos.createGraph();
    } else {
        var choiceContainer = $("#choicesResponseTimePercentiles");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesPercentiles", "#overviewResponseTimesPercentiles");
        $('#bodyResponseTimePercentiles .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimeDistributionInfos = {
        data: {"result": {"minY": 200.0, "minX": 0.0, "maxY": 2610907.0, "series": [{"data": [[0.0, 2610907.0], [50000.0, 200.0]], "isOverall": false, "label": "coordinatedOmission", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 100, "maxX": 50000.0, "title": "Response Time Distribution"}},
        getOptions: function() {
            var granularity = this.data.result.granularity;
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    barWidth: this.data.result.granularity
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " responses for " + label + " were between " + xval + " and " + (xval + granularity) + " ms";
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimeDistribution"), prepareData(data.result.series, $("#choicesResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshResponseTimeDistribution() {
    var infos = responseTimeDistributionInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var syntheticResponseTimeDistributionInfos = {
        data: {"result": {"minY": 200.0, "minX": 0.0, "ticks": [[0, "Requests having \nresponse time <= 100ms"], [1, "Requests having \nresponse time > 100ms and <= 1,000ms"], [2, "Requests having \nresponse time > 1,000ms"], [3, "Requests in error"]], "maxY": 2610907.0, "series": [{"data": [[2.0, 200.0]], "isOverall": false, "label": "Requests having \nresponse time > 1,000ms", "isController": false}, {"data": [[0.0, 2610907.0]], "isOverall": false, "label": "Requests having \nresponse time <= 100ms", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 2.0, "title": "Synthetic Response Times Distribution"}},
        getOptions: function() {
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendSyntheticResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times ranges",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                    tickLength:0,
                    min:-0.5,
                    max:3.5
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    align: "center",
                    barWidth: 0.25,
                    fill:.75
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " " + label;
                    }
                },
                colors: ["#9ACD32", "yellow", "orange", "#FF6347"]                
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            options.xaxis.ticks = data.result.ticks;
            $.plot($("#flotSyntheticResponseTimeDistribution"), prepareData(data.result.series, $("#choicesSyntheticResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshSyntheticResponseTimeDistribution() {
    var infos = syntheticResponseTimeDistributionInfos;
    prepareSeries(infos.data, true);
    if (isGraph($("#flotSyntheticResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerSyntheticResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var activeThreadsOverTimeInfos = {
        data: {"result": {"minY": 88.61957908163286, "minX": 1.527049485E12, "maxY": 100.0, "series": [{"data": [[1.52704951E12, 100.0], [1.527049685E12, 100.0], [1.527049555E12, 100.0], [1.527049725E12, 100.0], [1.527049635E12, 100.0], [1.527049505E12, 100.0], [1.52704955E12, 100.0], [1.52704972E12, 100.0], [1.527049715E12, 100.0], [1.5270495E12, 100.0], [1.527049585E12, 100.0], [1.527049545E12, 100.0], [1.527049495E12, 100.0], [1.52704971E12, 100.0], [1.52704958E12, 100.0], [1.52704954E12, 100.0], [1.52704949E12, 100.0], [1.527049575E12, 100.0], [1.527049705E12, 100.0], [1.527049535E12, 100.0], [1.52704957E12, 100.0], [1.5270497E12, 100.0], [1.527049485E12, 88.61957908163286], [1.52704953E12, 100.0], [1.527049565E12, 100.0], [1.527049695E12, 100.0], [1.527049525E12, 100.0], [1.527049735E12, 99.98182501230664], [1.52704956E12, 100.0], [1.527049515E12, 100.0], [1.52704969E12, 100.0], [1.52704952E12, 100.0], [1.52704973E12, 100.0]], "isOverall": false, "label": "benchmark", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 5000, "maxX": 1.527049735E12, "title": "Active Threads Over Time"}},
        getOptions: function() {
            return {
                series: {
                    stack: true,
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 6,
                    show: true,
                    container: '#legendActiveThreadsOverTime'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                selection: {
                    mode: 'xy'
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : At %x there were %y active threads"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesActiveThreadsOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotActiveThreadsOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewActiveThreadsOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Active Threads Over Time
function refreshActiveThreadsOverTime(fixTimestamps) {
    var infos = activeThreadsOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotActiveThreadsOverTime"))) {
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesActiveThreadsOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotActiveThreadsOverTime", "#overviewActiveThreadsOverTime");
        $('#footerActiveThreadsOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var timeVsThreadsInfos = {
        data: {"result": {"minY": 1.0, "minX": 1.0, "maxY": 19.6, "series": [{"data": [[3.0, 2.0], [6.0, 2.0], [7.0, 2.0], [10.0, 2.0], [11.0, 4.0], [12.0, 5.312500000000001], [13.0, 6.818181818181818], [14.0, 2.166666666666667], [15.0, 1.0], [16.0, 2.5], [17.0, 2.5], [18.0, 1.6], [19.0, 2.6], [20.0, 1.0], [22.0, 2.0], [23.0, 2.6], [24.0, 2.3333333333333335], [27.0, 6.0], [29.0, 5.0], [30.0, 4.25], [31.0, 5.0], [32.0, 4.0], [33.0, 4.0], [34.0, 4.928571428571428], [35.0, 4.75], [36.0, 5.666666666666667], [38.0, 4.6571428571428575], [42.0, 11.333333333333334], [43.0, 3.3333333333333335], [44.0, 5.5], [45.0, 5.705882352941177], [47.0, 6.98701298701299], [48.0, 5.153846153846154], [49.0, 7.423076923076924], [50.0, 5.909090909090907], [51.0, 6.822784810126581], [52.0, 8.25], [53.0, 6.444444444444445], [54.0, 6.664893617021277], [55.0, 4.2857142857142865], [56.0, 8.233333333333333], [57.0, 8.666666666666668], [58.0, 8.341463414634147], [59.0, 8.0], [60.0, 5.444444444444445], [61.0, 5.833333333333334], [63.0, 6.518518518518518], [64.0, 10.0], [65.0, 6.5], [66.0, 8.75], [67.0, 7.12], [68.0, 10.52], [69.0, 5.314285714285716], [70.0, 8.16470588235294], [71.0, 6.0], [72.0, 9.2], [73.0, 10.4], [74.0, 5.428571428571429], [75.0, 4.631578947368421], [76.0, 2.0], [77.0, 4.4], [78.0, 4.5], [79.0, 2.8571428571428568], [80.0, 7.857142857142856], [81.0, 4.357142857142858], [82.0, 9.222222222222221], [83.0, 9.5], [84.0, 10.333333333333332], [85.0, 4.291666666666666], [86.0, 7.695652173913043], [87.0, 10.043478260869566], [90.0, 7.833333333333334], [91.0, 4.944444444444444], [89.0, 5.333333333333333], [88.0, 6.0], [92.0, 6.35], [93.0, 18.0], [94.0, 9.88888888888889], [95.0, 5.0], [96.0, 19.6], [97.0, 17.500000000000004], [99.0, 11.141509433962263], [98.0, 5.461538461538462], [100.0, 9.553616225823404], [1.0, 1.7017892644135193]], "isOverall": false, "label": "coordinatedOmission", "isController": false}, {"data": [[99.95763252904474, 9.550904271636261]], "isOverall": false, "label": "coordinatedOmission-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Time VS Threads"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: { noColumns: 2,show: true, container: '#legendTimeVsThreads' },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s: At %x.2 active threads, Average response time was %y.2 ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesTimeVsThreads"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotTimesVsThreads"), dataset, options);
            // setup overview
            $.plot($("#overviewTimesVsThreads"), dataset, prepareOverviewOptions(options));
        }
};

// Time vs threads
function refreshTimeVsThreads(){
    var infos = timeVsThreadsInfos;
    prepareSeries(infos.data);
    if(isGraph($("#flotTimesVsThreads"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTimeVsThreads");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTimesVsThreads", "#overviewTimesVsThreads");
        $('#footerTimeVsThreads .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var bytesThroughputOverTimeInfos = {
        data : {"result": {"minY": 2960.0, "minX": 1.527049485E12, "maxY": 7053600.0, "series": [{"data": [[1.52704951E12, 6982400.0], [1.527049685E12, 2114240.0], [1.527049555E12, 6993120.0], [1.527049725E12, 6995280.0], [1.527049635E12, 8080.0], [1.527049505E12, 6856960.0], [1.52704955E12, 6986720.0], [1.52704972E12, 6977920.0], [1.527049715E12, 7039680.0], [1.5270495E12, 6948960.0], [1.527049585E12, 4658880.0], [1.527049545E12, 6960960.0], [1.527049495E12, 7025120.0], [1.52704971E12, 6982240.0], [1.52704958E12, 6983680.0], [1.52704954E12, 7046640.0], [1.52704949E12, 6881040.0], [1.527049575E12, 7003440.0], [1.527049705E12, 6980080.0], [1.527049535E12, 6758160.0], [1.52704957E12, 6971040.0], [1.5270497E12, 6984000.0], [1.527049485E12, 752640.0], [1.52704953E12, 7036480.0], [1.527049565E12, 6893600.0], [1.527049695E12, 7053600.0], [1.527049525E12, 6973680.0], [1.527049735E12, 6175520.0], [1.52704956E12, 6984560.0], [1.527049515E12, 6973200.0], [1.52704969E12, 6970000.0], [1.52704952E12, 6981440.0], [1.52704973E12, 6955360.0]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.52704951E12, 2583488.0], [1.527049685E12, 782239.2], [1.527049555E12, 2587454.4], [1.527049725E12, 2588253.6], [1.527049635E12, 2960.0], [1.527049505E12, 2537075.2], [1.52704955E12, 2585086.4], [1.52704972E12, 2581830.4], [1.527049715E12, 2604681.6], [1.5270495E12, 2571115.2], [1.527049585E12, 1723785.6], [1.527049545E12, 2575555.2], [1.527049495E12, 2599294.4], [1.52704971E12, 2583428.8], [1.52704958E12, 2583961.6], [1.52704954E12, 2607256.8], [1.52704949E12, 2545984.8], [1.527049575E12, 2591272.8], [1.527049705E12, 2582629.6], [1.527049535E12, 2500519.2], [1.52704957E12, 2579284.8], [1.5270497E12, 2584080.0], [1.527049485E12, 278476.8], [1.52704953E12, 2603497.6], [1.527049565E12, 2550632.0], [1.527049695E12, 2609832.0], [1.527049525E12, 2580261.6], [1.527049735E12, 2284942.4], [1.52704956E12, 2584287.2], [1.527049515E12, 2580084.0], [1.52704969E12, 2578900.0], [1.52704952E12, 2583132.8], [1.52704973E12, 2573483.2]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 5000, "maxX": 1.527049735E12, "title": "Bytes Throughput Over Time"}},
        getOptions : function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity) ,
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Bytes / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendBytesThroughputOverTime'
                },
                selection: {
                    mode: "xy"
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y"
                }
            };
        },
        createGraph : function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesBytesThroughputOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotBytesThroughputOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewBytesThroughputOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Bytes throughput Over Time
function refreshBytesThroughputOverTime(fixTimestamps) {
    var infos = bytesThroughputOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotBytesThroughputOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesBytesThroughputOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotBytesThroughputOverTime", "#overviewBytesThroughputOverTime");
        $('#footerBytesThroughputOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimesOverTimeInfos = {
        data: {"result": {"minY": 5.603509856446173, "minX": 1.527049485E12, "maxY": 50031.29, "series": [{"data": [[1.52704951E12, 5.69737626031159], [1.527049685E12, 195.5606765807698], [1.527049555E12, 5.689145903402186], [1.527049725E12, 5.692444047986641], [1.527049635E12, 50031.29], [1.527049505E12, 5.8011830315475175], [1.52704955E12, 5.698467950626299], [1.52704972E12, 5.7026162524075605], [1.527049715E12, 5.6570071366880335], [1.5270495E12, 5.723952936842335], [1.527049585E12, 5.603509856446173], [1.527049545E12, 5.718946811933953], [1.527049495E12, 5.66470038945959], [1.52704971E12, 5.701024313114475], [1.52704958E12, 5.704075788123096], [1.52704954E12, 5.650568214070817], [1.52704949E12, 5.759850255194005], [1.527049575E12, 5.68121951498123], [1.527049705E12, 5.700885949731289], [1.527049535E12, 5.891307693218325], [1.52704957E12, 5.707188597397267], [1.5270497E12, 5.701821305841977], [1.527049485E12, 7.445790816326516], [1.52704953E12, 5.655987084451346], [1.527049565E12, 5.7734826505744765], [1.527049695E12, 5.6396506748326996], [1.527049525E12, 5.7090431450826635], [1.527049735E12, 5.726895872736209], [1.52704956E12, 5.699943876206953], [1.527049515E12, 5.705959960993535], [1.52704969E12, 5.709796269727369], [1.52704952E12, 5.706501810514717], [1.52704973E12, 5.722746198615211]], "isOverall": false, "label": "coordinatedOmission", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 5000, "maxX": 1.527049735E12, "title": "Response Time Over Time"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average response time was %y ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Times Over Time
function refreshResponseTimeOverTime(fixTimestamps) {
    var infos = responseTimesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotResponseTimesOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesOverTime", "#overviewResponseTimesOverTime");
        $('#footerResponseTimesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var latenciesOverTimeInfos = {
        data: {"result": {"minY": 5.602239164777823, "minX": 1.527049485E12, "maxY": 50031.29, "series": [{"data": [[1.52704951E12, 5.696207607699387], [1.527049685E12, 195.55995761910125], [1.527049555E12, 5.688001921888923], [1.527049725E12, 5.691071694056587], [1.527049635E12, 50031.29], [1.527049505E12, 5.800086335635574], [1.52704955E12, 5.697425973847529], [1.52704972E12, 5.701297807942767], [1.527049715E12, 5.6554957043502085], [1.5270495E12, 5.722951348115403], [1.527049585E12, 5.602239164777823], [1.527049545E12, 5.717912471842968], [1.527049495E12, 5.6636982713463135], [1.52704971E12, 5.699695226746742], [1.52704958E12, 5.702884439149625], [1.52704954E12, 5.6493988624366125], [1.52704949E12, 5.757873809772972], [1.527049575E12, 5.680134333984556], [1.527049705E12, 5.699648141568582], [1.527049535E12, 5.890265989559241], [1.52704957E12, 5.7060983726960535], [1.5270497E12, 5.700675830469646], [1.527049485E12, 7.425807823129246], [1.52704953E12, 5.6550661694483715], [1.527049565E12, 5.7720668446095695], [1.527049695E12, 5.638437110128253], [1.527049525E12, 5.707976276513967], [1.527049735E12, 5.725587480892273], [1.52704956E12, 5.698626685145511], [1.527049515E12, 5.704789766534682], [1.52704969E12, 5.70864849354379], [1.52704952E12, 5.70534445615804], [1.52704973E12, 5.721538496928936]], "isOverall": false, "label": "coordinatedOmission", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 5000, "maxX": 1.527049735E12, "title": "Latencies Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response latencies in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendLatenciesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average latency was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesLatenciesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotLatenciesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewLatenciesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Latencies Over Time
function refreshLatenciesOverTime(fixTimestamps) {
    var infos = latenciesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotLatenciesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesLatenciesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotLatenciesOverTime", "#overviewLatenciesOverTime");
        $('#footerLatenciesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var connectTimeOverTimeInfos = {
        data: {"result": {"minY": 0.0, "minX": 1.527049485E12, "maxY": 0.023384353741496486, "series": [{"data": [[1.52704951E12, 4.1246562786433934E-4], [1.527049685E12, 0.003746168691111387], [1.527049555E12, 4.232731599057352E-4], [1.527049725E12, 4.2314246177421917E-4], [1.527049635E12, 0.0], [1.527049505E12, 5.250140003733352E-4], [1.52704955E12, 4.465614766299495E-4], [1.52704972E12, 6.19095661744468E-4], [1.527049715E12, 9.318605391154191E-4], [1.5270495E12, 5.295756487301702E-4], [1.527049585E12, 5.666597980630543E-4], [1.527049545E12, 6.780673930032603E-4], [1.527049495E12, 9.337918782881928E-4], [1.52704971E12, 7.562043126561117E-4], [1.52704958E12, 2.5201612903225676E-4], [1.52704954E12, 3.632937116129071E-4], [1.52704949E12, 0.001104484205875851], [1.527049575E12, 5.2545606159259E-4], [1.527049705E12, 3.323744140468268E-4], [1.527049535E12, 7.812777442380726E-4], [1.52704957E12, 4.1313778145010823E-4], [1.5270497E12, 4.925544100801824E-4], [1.527049485E12, 0.023384353741496486], [1.52704953E12, 2.95602346627861E-4], [1.527049565E12, 4.990135778112916E-4], [1.527049695E12, 0.0011228308948622013], [1.527049525E12, 5.850569570155191E-4], [1.527049735E12, 3.3681374200067384E-4], [1.52704956E12, 4.3524574203671697E-4], [1.527049515E12, 4.588997877588458E-4], [1.52704969E12, 7.116212338593974E-4], [1.52704952E12, 3.437686208002967E-4], [1.52704973E12, 5.86597961859624E-4]], "isOverall": false, "label": "coordinatedOmission", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 5000, "maxX": 1.527049735E12, "title": "Connect Time Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getConnectTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average Connect Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendConnectTimeOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average connect time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesConnectTimeOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotConnectTimeOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewConnectTimeOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Connect Time Over Time
function refreshConnectTimeOverTime(fixTimestamps) {
    var infos = connectTimeOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotConnectTimeOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesConnectTimeOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotConnectTimeOverTime", "#overviewConnectTimeOverTime");
        $('#footerConnectTimeOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var responseTimePercentilesOverTimeInfos = {
        data: {"result": {"minY": 0.0, "minX": 1.527049485E12, "maxY": 50054.0, "series": [{"data": [[1.52704951E12, 18.0], [1.527049685E12, 50054.0], [1.527049555E12, 19.0], [1.527049725E12, 17.0], [1.527049635E12, 50033.0], [1.527049505E12, 23.0], [1.52704955E12, 17.0], [1.52704972E12, 20.0], [1.527049715E12, 25.0], [1.5270495E12, 21.0], [1.527049585E12, 22.0], [1.527049545E12, 25.0], [1.527049495E12, 22.0], [1.52704971E12, 16.0], [1.52704958E12, 17.0], [1.52704954E12, 16.0], [1.52704949E12, 41.0], [1.527049575E12, 17.0], [1.527049705E12, 17.0], [1.527049535E12, 25.0], [1.52704957E12, 16.0], [1.5270497E12, 16.0], [1.527049485E12, 70.0], [1.52704953E12, 17.0], [1.527049565E12, 18.0], [1.527049695E12, 24.0], [1.527049525E12, 18.0], [1.527049735E12, 17.0], [1.52704956E12, 17.0], [1.527049515E12, 17.0], [1.52704969E12, 21.0], [1.52704952E12, 18.0], [1.52704973E12, 17.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.52704951E12, 1.0], [1.527049685E12, 2.0], [1.527049555E12, 1.0], [1.527049725E12, 2.0], [1.527049635E12, 50030.0], [1.527049505E12, 1.0], [1.52704955E12, 2.0], [1.52704972E12, 1.0], [1.527049715E12, 0.0], [1.5270495E12, 1.0], [1.527049585E12, 1.0], [1.527049545E12, 1.0], [1.527049495E12, 1.0], [1.52704971E12, 0.0], [1.52704958E12, 2.0], [1.52704954E12, 1.0], [1.52704949E12, 1.0], [1.527049575E12, 1.0], [1.527049705E12, 1.0], [1.527049535E12, 1.0], [1.52704957E12, 1.0], [1.5270497E12, 0.0], [1.527049485E12, 1.0], [1.52704953E12, 2.0], [1.527049565E12, 2.0], [1.527049695E12, 0.0], [1.527049525E12, 1.0], [1.527049735E12, 0.0], [1.52704956E12, 1.0], [1.527049515E12, 1.0], [1.52704969E12, 0.0], [1.52704952E12, 1.0], [1.52704973E12, 0.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.52704951E12, 8.0], [1.527049685E12, 8.0], [1.527049555E12, 8.0], [1.527049725E12, 8.0], [1.527049635E12, 9.0], [1.527049505E12, 8.0], [1.52704955E12, 8.0], [1.52704972E12, 8.0], [1.527049715E12, 8.0], [1.5270495E12, 8.0], [1.527049585E12, 8.0], [1.527049545E12, 8.0], [1.527049495E12, 8.0], [1.52704971E12, 8.0], [1.52704958E12, 8.0], [1.52704954E12, 8.0], [1.52704949E12, 8.0], [1.527049575E12, 8.0], [1.527049705E12, 8.0], [1.527049535E12, 8.0], [1.52704957E12, 8.0], [1.5270497E12, 8.0], [1.527049485E12, 13.0], [1.52704953E12, 8.0], [1.527049565E12, 8.0], [1.527049695E12, 8.0], [1.527049525E12, 8.0], [1.527049735E12, 8.0], [1.52704956E12, 8.0], [1.527049515E12, 8.0], [1.52704969E12, 8.0], [1.52704952E12, 8.0], [1.52704973E12, 8.0]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.52704951E12, 10.0], [1.527049685E12, 11.0], [1.527049555E12, 10.0], [1.527049725E12, 9.0], [1.527049635E12, 10.0], [1.527049505E12, 10.0], [1.52704955E12, 10.0], [1.52704972E12, 10.0], [1.527049715E12, 10.0], [1.5270495E12, 10.0], [1.527049585E12, 10.0], [1.527049545E12, 10.0], [1.527049495E12, 10.0], [1.52704971E12, 10.0], [1.52704958E12, 10.0], [1.52704954E12, 10.0], [1.52704949E12, 10.0], [1.527049575E12, 10.0], [1.527049705E12, 9.0], [1.527049535E12, 10.0], [1.52704957E12, 9.0], [1.5270497E12, 10.0], [1.527049485E12, 22.0], [1.52704953E12, 10.0], [1.527049565E12, 10.0], [1.527049695E12, 9.0], [1.527049525E12, 10.0], [1.527049735E12, 9.0], [1.52704956E12, 10.0], [1.527049515E12, 10.0], [1.52704969E12, 9.0], [1.52704952E12, 10.0], [1.52704973E12, 10.0]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.52704951E12, 9.0], [1.527049685E12, 9.0], [1.527049555E12, 9.0], [1.527049725E12, 9.0], [1.527049635E12, 9.0], [1.527049505E12, 9.0], [1.52704955E12, 9.0], [1.52704972E12, 9.0], [1.527049715E12, 9.0], [1.5270495E12, 9.0], [1.527049585E12, 9.0], [1.527049545E12, 9.0], [1.527049495E12, 9.0], [1.52704971E12, 9.0], [1.52704958E12, 9.0], [1.52704954E12, 9.0], [1.52704949E12, 9.0], [1.527049575E12, 9.0], [1.527049705E12, 9.0], [1.527049535E12, 9.0], [1.52704957E12, 9.0], [1.5270497E12, 9.0], [1.527049485E12, 16.0], [1.52704953E12, 9.0], [1.527049565E12, 9.0], [1.527049695E12, 9.0], [1.527049525E12, 9.0], [1.527049735E12, 9.0], [1.52704956E12, 9.0], [1.527049515E12, 9.0], [1.52704969E12, 9.0], [1.52704952E12, 9.0], [1.52704973E12, 9.0]], "isOverall": false, "label": "95th percentile", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 5000, "maxX": 1.527049735E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentilesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Response time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentilesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimePercentilesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimePercentilesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Time Percentiles Over Time
function refreshResponseTimePercentilesOverTime(fixTimestamps) {
    var infos = responseTimePercentilesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotResponseTimePercentilesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimePercentilesOverTime", "#overviewResponseTimePercentilesOverTime");
        $('#footerResponseTimePercentilesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var responseTimeVsRequestInfos = {
    data: {"result": {"minY": 5.0, "minX": 20.0, "maxY": 50031.0, "series": [{"data": [[11647.0, 5.0], [15438.0, 6.0], [17202.0, 5.0], [17372.0, 6.0], [17142.0, 6.0], [16895.0, 6.0], [17402.0, 5.0], [17234.0, 6.0], [17388.0, 6.0], [17482.0, 5.0], [17562.0, 5.0], [17508.0, 5.0], [17488.0, 5.0], [17456.0, 5.0], [17433.0, 5.0], [17453.0, 5.0], [17450.0, 5.0], [17444.0, 6.0], [17455.0, 5.0], [17459.0, 5.0], [17434.0, 5.0], [17427.0, 5.0], [17425.0, 5.0], [17591.0, 5.0], [17616.0, 5.0], [17599.0, 5.0], [17634.0, 5.0], [17466.0, 5.0], [17461.0, 5.0], [17460.0, 5.0], [1881.0, 7.0], [20.0, 50031.0], [5285.0, 6.0]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 5000, "maxX": 17634.0, "title": "Response Time Vs Request"}},
    getOptions: function() {
        return {
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Response Time in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: {
                noColumns: 2,
                show: true,
                container: '#legendResponseTimeVsRequest'
            },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesResponseTimeVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotResponseTimeVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewResponseTimeVsRequest"), dataset, prepareOverviewOptions(options));

    }
};

// Response Time vs Request
function refreshResponseTimeVsRequest() {
    var infos = responseTimeVsRequestInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeVsRequest"))){
        infos.create();
    }else{
        var choiceContainer = $("#choicesResponseTimeVsRequest");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimeVsRequest", "#overviewResponseTimeVsRequest");
        $('#footerResponseRimeVsRequest .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var latenciesVsRequestInfos = {
    data: {"result": {"minY": 5.0, "minX": 20.0, "maxY": 50031.0, "series": [{"data": [[11647.0, 5.0], [15438.0, 6.0], [17202.0, 5.0], [17372.0, 6.0], [17142.0, 6.0], [16895.0, 6.0], [17402.0, 5.0], [17234.0, 5.0], [17388.0, 6.0], [17482.0, 5.0], [17562.0, 5.0], [17508.0, 5.0], [17488.0, 5.0], [17456.0, 5.0], [17433.0, 5.0], [17453.0, 5.0], [17450.0, 5.0], [17444.0, 6.0], [17455.0, 5.0], [17459.0, 5.0], [17434.0, 5.0], [17427.0, 5.0], [17425.0, 5.0], [17591.0, 5.0], [17616.0, 5.0], [17599.0, 5.0], [17634.0, 5.0], [17466.0, 5.0], [17461.0, 5.0], [17460.0, 5.0], [1881.0, 7.0], [20.0, 50031.0], [5285.0, 6.0]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 5000, "maxX": 17634.0, "title": "Latencies Vs Request"}},
    getOptions: function() {
        return{
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Latency in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: { noColumns: 2,show: true, container: '#legendLatencyVsRequest' },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesLatencyVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotLatenciesVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewLatenciesVsRequest"), dataset, prepareOverviewOptions(options));
    }
};

// Latencies vs Request
function refreshLatenciesVsRequest() {
        var infos = latenciesVsRequestInfos;
        prepareSeries(infos.data);
        if(isGraph($("#flotLatenciesVsRequest"))){
            infos.createGraph();
        }else{
            var choiceContainer = $("#choicesLatencyVsRequest");
            createLegend(choiceContainer, infos);
            infos.createGraph();
            setGraphZoomable("#flotLatenciesVsRequest", "#overviewLatenciesVsRequest");
            $('#footerLatenciesVsRequest .legendColorBox > div').each(function(i){
                $(this).clone().prependTo(choiceContainer.find("li").eq(i));
            });
        }
};

var hitsPerSecondInfos = {
        data: {"result": {"minY": 20.0, "minX": 1.527049485E12, "maxY": 17634.2, "series": [{"data": [[1.52704951E12, 17455.8], [1.527049685E12, 5285.2], [1.527049555E12, 17482.8], [1.527049725E12, 17488.4], [1.527049635E12, 20.0], [1.527049505E12, 17142.4], [1.52704955E12, 17467.0], [1.52704972E12, 17444.6], [1.527049715E12, 17599.2], [1.5270495E12, 17372.4], [1.527049585E12, 11647.4], [1.527049545E12, 17402.4], [1.527049495E12, 17562.8], [1.52704971E12, 17455.6], [1.52704958E12, 17459.0], [1.52704954E12, 17616.4], [1.52704949E12, 17202.6], [1.527049575E12, 17508.8], [1.527049705E12, 17450.4], [1.527049535E12, 16895.6], [1.52704957E12, 17427.6], [1.5270497E12, 17459.8], [1.527049485E12, 1901.6], [1.52704953E12, 17591.0], [1.527049565E12, 17233.8], [1.527049695E12, 17634.2], [1.527049525E12, 17434.2], [1.527049735E12, 15419.0], [1.52704956E12, 17461.4], [1.527049515E12, 17433.0], [1.52704969E12, 17425.0], [1.52704952E12, 17453.8], [1.52704973E12, 17388.2]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 5000, "maxX": 1.527049735E12, "title": "Hits Per Second"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of hits / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendHitsPerSecond"
                },
                selection: {
                    mode : 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y.2 hits/sec"
                }
            };
        },
        createGraph: function createGraph() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesHitsPerSecond"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotHitsPerSecond"), dataset, options);
            // setup overview
            $.plot($("#overviewHitsPerSecond"), dataset, prepareOverviewOptions(options));
        }
};

// Hits per second
function refreshHitsPerSecond(fixTimestamps) {
    var infos = hitsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if (isGraph($("#flotHitsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesHitsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotHitsPerSecond", "#overviewHitsPerSecond");
        $('#footerHitsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var codesPerSecondInfos = {
        data: {"result": {"minY": 20.0, "minX": 1.527049485E12, "maxY": 17634.0, "series": [{"data": [[1.52704951E12, 17456.0], [1.527049685E12, 5285.4], [1.527049555E12, 17482.8], [1.527049725E12, 17488.2], [1.527049635E12, 20.0], [1.527049505E12, 17142.4], [1.52704955E12, 17466.8], [1.52704972E12, 17444.8], [1.527049715E12, 17599.2], [1.5270495E12, 17372.4], [1.527049585E12, 11647.2], [1.527049545E12, 17402.4], [1.527049495E12, 17562.8], [1.52704971E12, 17455.6], [1.52704958E12, 17459.2], [1.52704954E12, 17616.6], [1.52704949E12, 17202.6], [1.527049575E12, 17508.6], [1.527049705E12, 17450.2], [1.527049535E12, 16895.4], [1.52704957E12, 17427.6], [1.5270497E12, 17460.0], [1.527049485E12, 1881.6], [1.52704953E12, 17591.2], [1.527049565E12, 17234.0], [1.527049695E12, 17634.0], [1.527049525E12, 17434.2], [1.527049735E12, 15438.8], [1.52704956E12, 17461.4], [1.527049515E12, 17433.0], [1.52704969E12, 17425.0], [1.52704952E12, 17453.6], [1.52704973E12, 17388.4]], "isOverall": false, "label": "200", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 5000, "maxX": 1.527049735E12, "title": "Codes Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendCodesPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "Number of Response Codes %s at %x was %y.2 responses / sec"
                }
            };
        },
    createGraph: function() {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesCodesPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotCodesPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewCodesPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Codes per second
function refreshCodesPerSecond(fixTimestamps) {
    var infos = codesPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotCodesPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesCodesPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotCodesPerSecond", "#overviewCodesPerSecond");
        $('#footerCodesPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var transactionsPerSecondInfos = {
        data: {"result": {"minY": 20.0, "minX": 1.527049485E12, "maxY": 17634.0, "series": [{"data": [[1.52704951E12, 17456.0], [1.527049685E12, 5285.4], [1.527049555E12, 17482.8], [1.527049725E12, 17488.2], [1.527049635E12, 20.0], [1.527049505E12, 17142.4], [1.52704955E12, 17466.8], [1.52704972E12, 17444.8], [1.527049715E12, 17599.2], [1.5270495E12, 17372.4], [1.527049585E12, 11647.2], [1.527049545E12, 17402.4], [1.527049495E12, 17562.8], [1.52704971E12, 17455.6], [1.52704958E12, 17459.2], [1.52704954E12, 17616.6], [1.52704949E12, 17202.6], [1.527049575E12, 17508.6], [1.527049705E12, 17450.2], [1.527049535E12, 16895.4], [1.52704957E12, 17427.6], [1.5270497E12, 17460.0], [1.527049485E12, 1881.6], [1.52704953E12, 17591.2], [1.527049565E12, 17234.0], [1.527049695E12, 17634.0], [1.527049525E12, 17434.2], [1.527049735E12, 15438.8], [1.52704956E12, 17461.4], [1.527049515E12, 17433.0], [1.52704969E12, 17425.0], [1.52704952E12, 17453.6], [1.52704973E12, 17388.4]], "isOverall": false, "label": "coordinatedOmission-success", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 5000, "maxX": 1.527049735E12, "title": "Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTransactionsPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                }
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTransactionsPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTransactionsPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewTransactionsPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Transactions per second
function refreshTransactionsPerSecond(fixTimestamps) {
    var infos = transactionsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 0);
    }
    if(isGraph($("#flotTransactionsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTransactionsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTransactionsPerSecond", "#overviewTransactionsPerSecond");
        $('#footerTransactionsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

// Collapse the graph matching the specified DOM element depending the collapsed
// status
function collapse(elem, collapsed){
    if(collapsed){
        $(elem).parent().find(".fa-chevron-up").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(elem).parent().find(".fa-chevron-down").removeClass("fa-chevron-down").addClass("fa-chevron-up");
        if (elem.id == "bodyBytesThroughputOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshBytesThroughputOverTime(true);
            }
            document.location.href="#bytesThroughputOverTime";
        } else if (elem.id == "bodyLatenciesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesOverTime(true);
            }
            document.location.href="#latenciesOverTime";
        } else if (elem.id == "bodyConnectTimeOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshConnectTimeOverTime(true);
            }
            document.location.href="#connectTimeOverTime";
        } else if (elem.id == "bodyResponseTimePercentilesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimePercentilesOverTime(true);
            }
            document.location.href="#responseTimePercentilesOverTime";
        } else if (elem.id == "bodyResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeDistribution();
            }
            document.location.href="#responseTimeDistribution" ;
        } else if (elem.id == "bodySyntheticResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshSyntheticResponseTimeDistribution();
            }
            document.location.href="#syntheticResponseTimeDistribution" ;
        } else if (elem.id == "bodyActiveThreadsOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshActiveThreadsOverTime(true);
            }
            document.location.href="#activeThreadsOverTime";
        } else if (elem.id == "bodyTimeVsThreads") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTimeVsThreads();
            }
            document.location.href="#timeVsThreads" ;
        } else if (elem.id == "bodyCodesPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCodesPerSecond(true);
            }
            document.location.href="#codesPerSecond";
        } else if (elem.id == "bodyTransactionsPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTransactionsPerSecond(true);
            }
            document.location.href="#transactionsPerSecond";
        } else if (elem.id == "bodyResponseTimeVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeVsRequest();
            }
            document.location.href="#responseTimeVsRequest";
        } else if (elem.id == "bodyLatenciesVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesVsRequest();
            }
            document.location.href="#latencyVsRequest";
        }
    }
}

// Collapse
$(function() {
        $('.collapse').on('shown.bs.collapse', function(){
            collapse(this, false);
        }).on('hidden.bs.collapse', function(){
            collapse(this, true);
        });
});

$(function() {
    $(".glyphicon").mousedown( function(event){
        var tmp = $('.in:not(ul)');
        tmp.parent().parent().parent().find(".fa-chevron-up").removeClass("fa-chevron-down").addClass("fa-chevron-down");
        tmp.removeClass("in");
        tmp.addClass("out");
    });
});

/*
 * Activates or deactivates all series of the specified graph (represented by id parameter)
 * depending on checked argument.
 */
function toggleAll(id, checked){
    var placeholder = document.getElementById(id);

    var cases = $(placeholder).find(':checkbox');
    cases.prop('checked', checked);
    $(cases).parent().children().children().toggleClass("legend-disabled", !checked);

    var choiceContainer;
    if ( id == "choicesBytesThroughputOverTime"){
        choiceContainer = $("#choicesBytesThroughputOverTime");
        refreshBytesThroughputOverTime(false);
    } else if(id == "choicesResponseTimesOverTime"){
        choiceContainer = $("#choicesResponseTimesOverTime");
        refreshResponseTimeOverTime(false);
    } else if ( id == "choicesLatenciesOverTime"){
        choiceContainer = $("#choicesLatenciesOverTime");
        refreshLatenciesOverTime(false);
    } else if ( id == "choicesConnectTimeOverTime"){
        choiceContainer = $("#choicesConnectTimeOverTime");
        refreshConnectTimeOverTime(false);
    } else if ( id == "responseTimePercentilesOverTime"){
        choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        refreshResponseTimePercentilesOverTime(false);
    } else if ( id == "choicesResponseTimePercentiles"){
        choiceContainer = $("#choicesResponseTimePercentiles");
        refreshResponseTimePercentiles();
    } else if(id == "choicesActiveThreadsOverTime"){
        choiceContainer = $("#choicesActiveThreadsOverTime");
        refreshActiveThreadsOverTime(false);
    } else if ( id == "choicesTimeVsThreads"){
        choiceContainer = $("#choicesTimeVsThreads");
        refreshTimeVsThreads();
    } else if ( id == "choicesSyntheticResponseTimeDistribution"){
        choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        refreshSyntheticResponseTimeDistribution();
    } else if ( id == "choicesResponseTimeDistribution"){
        choiceContainer = $("#choicesResponseTimeDistribution");
        refreshResponseTimeDistribution();
    } else if ( id == "choicesHitsPerSecond"){
        choiceContainer = $("#choicesHitsPerSecond");
        refreshHitsPerSecond(false);
    } else if(id == "choicesCodesPerSecond"){
        choiceContainer = $("#choicesCodesPerSecond");
        refreshCodesPerSecond(false);
    } else if ( id == "choicesTransactionsPerSecond"){
        choiceContainer = $("#choicesTransactionsPerSecond");
        refreshTransactionsPerSecond(false);
    } else if ( id == "choicesResponseTimeVsRequest"){
        choiceContainer = $("#choicesResponseTimeVsRequest");
        refreshResponseTimeVsRequest();
    } else if ( id == "choicesLatencyVsRequest"){
        choiceContainer = $("#choicesLatencyVsRequest");
        refreshLatenciesVsRequest();
    }
    var color = checked ? "black" : "#818181";
    choiceContainer.find("label").each(function(){
        this.style.color = color;
    });
}

// Unchecks all boxes for "Hide all samples" functionality
function uncheckAll(id){
    toggleAll(id, false);
}

// Checks all boxes for "Show all samples" functionality
function checkAll(id){
    toggleAll(id, true);
}

// Prepares data to be consumed by plot plugins
function prepareData(series, choiceContainer, customizeSeries){
    var datasets = [];

    // Add only selected series to the data set
    choiceContainer.find("input:checked").each(function (index, item) {
        var key = $(item).attr("name");
        var i = 0;
        var size = series.length;
        while(i < size && series[i].label != key)
            i++;
        if(i < size){
            var currentSeries = series[i];
            datasets.push(currentSeries);
            if(customizeSeries)
                customizeSeries(currentSeries);
        }
    });
    return datasets;
}

/*
 * Ignore case comparator
 */
function sortAlphaCaseless(a,b){
    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
};

/*
 * Creates a legend in the specified element with graph information
 */
function createLegend(choiceContainer, infos) {
    // Sort series by name
    var keys = [];
    $.each(infos.data.result.series, function(index, series){
        keys.push(series.label);
    });
    keys.sort(sortAlphaCaseless);

    // Create list of series with support of activation/deactivation
    $.each(keys, function(index, key) {
        var id = choiceContainer.attr('id') + index;
        $('<li />')
            .append($('<input id="' + id + '" name="' + key + '" type="checkbox" checked="checked" hidden />'))
            .append($('<label />', { 'text': key , 'for': id }))
            .appendTo(choiceContainer);
    });
    choiceContainer.find("label").click( function(){
        if (this.style.color !== "rgb(129, 129, 129)" ){
            this.style.color="#818181";
        }else {
            this.style.color="black";
        }
        $(this).parent().children().children().toggleClass("legend-disabled");
    });
    choiceContainer.find("label").mousedown( function(event){
        event.preventDefault();
    });
    choiceContainer.find("label").mouseenter(function(){
        this.style.cursor="pointer";
    });

    // Recreate graphe on series activation toggle
    choiceContainer.find("input").click(function(){
        infos.createGraph();
    });
}
