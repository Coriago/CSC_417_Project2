#!/usr/bin/env node

import * as fs from "fs";

/**
 * @author: Daniel Mills ( demills )
 * @file  : argmin.ts
 *
 * This script groups records (sorted numerically by their last column) of a 
 * dataset (read from STDIN) into "best" and "rest" classes by:
 *
 *    1) Determining an index to split the records on such that aggregate
 *       variance between records above and below the index is minimized.
 *
 *           i.e.: Records are split into two groups, those below and above the
 *           index. Standard deviation is calculated for each group, and then
 *           the expected value of these two standard deviations is calculated.
 *
 *    2) Splitting the records on this index.
 *    3) Repeat 1 and 2 on the records above the split index until either:
 *           - There are sqrt( dataset_length) records above or 
 *             below are the split index. ( minBinSize )
 *           - The range of the values above or below the split index is  
 *             less than (0.3 * stddev( dataset[ last_index ] )). ( minRise )
 *
 * The "best" records are those remaining in the uppermost partition. The "rest"
 * is everything else.
 */

// The column names of the input data.
var attributes: Array<String>; 
var numCols:number;

// The input data itself.
var rows:number[][]; 
var numRows:number;

// An array of the last column of the input.
var lastCol:number[]; 

// allStdDevs[ i ] stores the standard deviation of elements in 
// "lastCol" from i to "naumRows".
var allStdDevs:number[]; 

// Minimum number of records allowed in a partition of the dataset.
// The choice of split index depends on this value.
var minBinSize:number;

// Minumum range allowed for values of a partition of the subset.
// The choice of split index depends on this value.
var minRise:number;

// A medium range "effect size" value. Used with the total standard 
// deviation of the dataset's last column to determine "minRise".
var COHEN:number = 0.3;

/**
 * Reads data, assuming CSV format, from STDIN into two arrays.
 *   - "attributes" : A 1D array of strings; the column names. 
 *   - "data"       : A 2D array of numbers; the raw data
 */
function readInput() {
    var data:Array<String> = fs.readFileSync( '/dev/stdin', 'utf8' ).split( "\n" );
    attributes = data[ 0 ].split( "," );
    rows = data.slice( 1, data.length - 1).map( 
        line => line.split(",").map(Number)
    );
}

/**
 * Given an "aggregate" of statistics (mean, stddev, size, etc.) about an 
 * attribute (probably "dom"), numInc() is used to update these statistics 
 * for a single additional value; i.e. A moving/rolling calculation of stats.
 *
 * "aggregate" has structure { count, mean, M2, sd, max, min }
 *
 * @param aggr:  A collection of statistics on the existing sample set.
 * @param value: A new value added to the set.
 */
function numInc( aggr, value ) {
    // TODO maybe handle case where "value" is "?".
    aggr.count++; 
    var delta  = value - aggr.mean;
    aggr.mean += delta / aggr.count;
    aggr.M2 += delta * ( value - aggr.mean );
    if ( value > aggr.max ) aggr.max = value; 
    if ( value < aggr.min ) aggr.min = value;
    if ( aggr.count >= 2 ) aggr.sd = Math.sqrt( aggr.M2 / ( aggr.count - 1 + 10**-32) );
}

function numDec( aggr, value ) {
    if ( aggr.count == 1 ) return;
    aggr.count--; 
    var delta  = value - aggr.mean;
    aggr.mean -= delta / aggr.count;
    aggr.M2 -= delta * ( value - aggr.mean );
    if ( aggr.count >= 2 ) {
        aggr.sd = Math.sqrt( aggr.M2 / ( aggr.count - 1 + 10**-32) );
    }
}

function getStdDev( lo, hi ) {
    var aggr = { count: 0, mean: 0, M2: 0, sd: 0, max: -1 * 10**32, min: 10**32 };
    // Assumes we're working with "lastCol" to avoid passing arrays by value.
    for ( var i = lo; i < hi; i++ ) {
        numInc( aggr, lastCol[ i ]);
    }
    return aggr;
}

/**
 * Initializes values that are reused throughout "calcSplits()".
 */
function initValues() {
    numRows = rows.length;
    numCols = rows[ 0 ].length;

    // The minumum number of records allowed in a single partition.
    minBinSize = Math.floor( Math.sqrt( numRows ) );

    // Stores the last column of the data (i.e. the "dom" values).
    lastCol = rows.map( row => row[ numCols - 1] );

    // Calculates the standard deviation of all the "dom" values.
    var totalStdDev = getStdDev( 0, numRows ).sd;

    // The minimum range of "dom" values for a partition of the records.
    minRise = COHEN * totalStdDev ;
}

/**
 * Calculates the indices on which to repeatedly partition the records
 * such that the expected value of the standard deviations of each 
 * partition's "dom" values is minimized. The upper bound of the partition 
 * a record belongs to is appended to the input data and printed to STDOUT. 
 * All records with the number of data rows as this last column are those
 * belonging to the "best" group. The rest are, well, the "rest".
 */
function calcSplits() {

    /**
     * Returns the expected value of the standard deviations of "dom"
     * values for the two partitions of the records currently being
     * considered in "argmin()". 
     *
     * @param aggrA: standard deviation of one partition
     * @param aggrB: standard deviation of the other
     */
    function getTotalVariance( aggrA, aggrB ) {
        var count:number = aggrA.count + aggrB.count + 0.0001;
        var stdDevA:number = ( ( aggrA.count / count ) * aggrA.sd );
        var stdDevB:number = ( ( aggrB.count / count ) * aggrB.sd );
        return stdDevA + stdDevB;
    }

    /**
     * Calculates the index on which to partition the records from "min" to
     * to "max" such that the expected value of the standard deviations 
     * is minimized and no stopping condition (< minRise or < minBinSize)
     * is reached.
     *
     * @param  min: the lower bound of the range of records to consider
     * @param  max: the upper bound of the range of records to consider
     * @return The index on which to partition the record
     */
    function argmin( min, max ) {
        // Stores the best index to split on.
        var cut:number;

        // If the range of records to consider isn't large enough, skip 
        // and return the current value of "cut".
        if ( ( max - min ) > ( 2 * minBinSize ) ) {
            var aboveSplitAggr = getStdDev( min, numRows );
            var belowSplitAggr = getStdDev( 0, 0);
            var best:number = aboveSplitAggr.sd;

            // Stores the expected value of the standard deviations for a
            // split at index "split".
            var tmp:number;

            // The value of the current row's "dom" value.
            var value:number;

            // Iterates from index "min" to "max" in the column of "dom" values.
            // Each index is considered for being the best split, according to
            // the expected value of standard deviations of the partitions.
            for ( var split = min; split < max; split++ ) {
                value = lastCol[ split ];

                // Updates aggregate statistics for each partition, where "value"
                // is added to the lower partition and removed from the upper
                // partition.
                numInc( belowSplitAggr, value );
                numDec( aboveSplitAggr, value );

                // Checks that the current split index doesn't create the minimum
                // size partitions and returns the current split if so.
                if ( ( belowSplitAggr.count >= minBinSize ) &&
                     ( aboveSplitAggr.count >= minBinSize ) ) {

                    // Checks that the current partitions' ranges are above the 
                    // minimum allowed and returns the current split if so.
                    if ( ( belowSplitAggr.max - belowSplitAggr.min ) > minRise ) {
                        if ( ( aboveSplitAggr.max - aboveSplitAggr.min ) > minRise ) {

                            // Calculates the expected value of the partitions' 
                            // standard deviations.
                            tmp = getTotalVariance( belowSplitAggr, aboveSplitAggr ) * 1.05;
                            // If the current split has a lower aggregate variance, 
                            // it is set as the new best value.
                            if ( tmp < best ) {
                                cut = split;
                                best = tmp;

                            }
                        }
                    }
                }
            }
        }
        return cut + 1;
    }


    // Writes the first line of output, the attribute names.
    for ( var i = 0; i < numCols - 1; i++ ) {
        process.stdout.write( attributes[ i ] + ", " );
    }
    process.stdout.write( attributes[ i ] + "\n" ); 

    // Variables used in the two for-loops below for storing split positions.
    var cut:number = 0;
    var prevCut:number;

    // Calculates the optimal cuts, then prints the input data with 
    // the cuts as the last column. This for loop only prints 
    for ( var i = 0; i < numRows; i++ ) {
        if ( ( numRows - i ) > minBinSize ) {
            // Stores this for use in the next for-loop.
            prevCut = cut;

            // Calculates the next split position.
            cut = argmin( i, numRows);

            // Write out the rows from "i" to "cut".
            for ( var j = i; j < cut; j++ ) {
                process.stdout.write( rows[ j ] + "," + cut + "\n" );
            }

            // Skip ahead to the next.
            i = cut - 1;
        }
    }

    // Prints the input data from the "bestrest" cut to "numRows" 
    // with the cut as the last column.
    for ( var i = prevCut; i < numRows; i++ ) {
        process.stdout.write( rows[ i ] + "," + numRows + "\n" );
    }
}

// Reads from STDIN into they arrays "attributes" and "data".
readInput();
// Initializes values reused throughout program.
initValues();
// Iteratively partitions the data into "best" and "rest" and prints output.
calcSplits();
