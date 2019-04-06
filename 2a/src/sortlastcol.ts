#!/usr/bin/env node

import * as fs from "fs";
import stream = require("stream");

/**
 * @file sortlastcol.ts
 * @author Daniel Curtis Mills
 * 
 * This filter in the pipe reads in comma-separated values from standard input.
 * It reads each line, not including the header line, then parses them as
 * comma-separated values, and stores the values in a 2D array. It then sorts
 * the rows by the value in their last column, and prints the values to standard
 * output in the same comma-separated format with the same header line.
 * 
 * The user can choose which sorting algorithm the program uses, thus implementing
 * the strategy pattern. By default, the program uses mergeSort (implementing recursion,
 * which is another abstraction). The user can specify a different sorting algorithm
 * using one of the following command line args:
 * -m = mergeSort
 * -b = bubbleSort
 * -s = selectionSort
 */

// start by reading the values
readVals();

/**
 * Reads comma separated values from standard input
 * and stores it in a 2D array
 */
function readVals() {
    var data: string[] = fs.readFileSync('/dev/stdin', 'utf8').split("\n");
    //prints the header
    console.log(data[0]);
    var vals: number[][] = data.slice(1, data.length - 1).map( 
        line => line.split(",").map(Number)
    );

    processVals(vals);
}

/**
 * Processes commang line args, sorts the vals array,
 * and calls the printVals function
 * @param vals the 2D array of vals we are processing
 */
function processVals(vals: number[][]): void {
    //command line arguments array
    var args: string[] = process.argv;
    //user entered too many arguments
    if (args.length > 3)
        argsErr();
    //-m or no args at all means mergeSort
    if (args.length == 2 || args[2] === "-m")
        mergeSort(vals);
    //-b means bubbleSort
    else if (args[2] === "-b")
        bubbleSort(vals);
    //-s means selection sort
    else if (args[2] === "-s")
        selectionSort(vals);
    else if (args[2] === "-bogo")
        bogoSort(vals);
    //anything else is an invalid arg
    else
        argsErr();

    //after sorting, print the vals
    printVals(vals);
}

/**
 * Prints an error message and halts execution of the program
 */
function argsErr(): void {
    process.stderr.write("Invalid command line args\n");
    process.stderr.write("-m: merge sort (default)\n");
    process.stderr.write("-b: bubble sort\n");
    process.stderr.write("-s: selection sort\n");
    process.exit(-1);
}

/**
 * Recursive divide & conquer sorting algorithm
 * We sort rows by their last column
 * @param vals the 2D array we are sorting
 * @param n the number of rows in the vals array
 */
function mergeSort(vals: number[][], n: number = vals.length): void {
    //base case: only one element
    if (n < 2)
        return;
    var mid: number = Math.floor(n / 2);
    var left: number[][] = [];
    var right: number[][] = [];
    for (var i: number = 0; i < mid; i++)
        left[i] = vals[i];

    for (var i: number = mid; i < n; i++)
        right[i - mid] = vals[i];

    mergeSort(left, mid);
    mergeSort(right, n - mid);

    merge(vals, left, right, mid, n - mid);
}

/**
 * Helper method for mergeSort algorithm, merges arrays together
 * @param vals the vals array we are sorting
 * @param left left half of the array
 * @param right right half of the array
 * @param leftn number of elements in left array
 * @param rightn number of elements in right array
 */
function merge(vals: number[][], left: number[][], right: number[][],
    leftn: number, rightn: number): void {
    var i: number = 0;
    var j: number = 0;
    var k: number = 0;
    while (i < leftn && j < rightn)
        //comparing last col of row *i* in left array to last col of row *j* in right array
        if (left[i][left[i].length - 1] <= right[j][right[j].length - 1])
            vals[k++] = left[i++];
        else
            vals[k++] = right[j++];

    while (i < leftn)
        vals[k++] = left[i++];
    while (j < rightn)
        vals[k++] = right[j++];
}

/**
 * Sorts by switching elements of the array if they are out of order
 * Sorts rows by their last column
 * @param vals the 2D array we are sorting
 */
function bubbleSort(vals: number[][]): void {
    var n: number = vals.length;
    for (var i: number = 0; i < n - 1; i++)
        for (var j: number = 0; j < n - i - 1; j++)
            //compares last col of row *j* with last col of row *j+1*
            if (vals[j][vals[j].length - 1] > vals[j + 1][vals[j + 1].length - 1]) {
                //swap rows
                var temp: number[] = vals[j];
                vals[j] = vals[j + 1];
                vals[j + 1] = temp;
            }
}

/**
 * Sorts by finding min value and bringing it to the front
 * Sorts rows by their last column
 * @param vals The 2D array we are sorting
 */
function selectionSort(vals: number[][]): void {
    var n: number = vals.length;
    for (var i: number = 0; i < n - 1; i++) {
        var min: number = i;
        for (var j: number = i + 1; j < n; j++)
            //compares last col of row *j* with last col of row *min*
            if (vals[j][vals[j].length - 1] < vals[min][vals[min].length - 1])
                min = j;

        //swap rows
        var temp: number[] = vals[min];
        vals[min] = vals[i];
        vals[i] = temp;
    }
}

/**
 * Random sorting algorithm. Sorts rows of 2D array
 * by the value in their last column
 * @param vals The 2D array being sorted
 */
function bogoSort(vals: number[][]): void {
    var n = vals.length;
    while (!isSorted(vals)) {
        //swaps every element with another random element
        for (var i = 0; i < n; i++) {
            var j = Math.floor(Math.random() * i);
            var temp = vals[i];
            vals[i] = vals[j];
            vals[j] = temp;
        }
    }
}

/**
 * Determines whether or not the vals array is sorted.
 * Tests based on the value in the last column of each row
 * @param vals The 2D array being tested
 * @returns true if the array is sorted
 */
function isSorted(vals: number[][]): boolean {
    var n = vals.length;
    for (var i = 1; i < n; i++)
        //compares last col of row *i* with last col of row *i-1*
        if (vals[i][vals[i].length - 1] < vals[i - 1][vals[i - 1].length - 1])
            return false;
    return true;
}

/**
 * Prints our sorted values, separated by commas
 * @param vals the 2D array we are printing
 */
function printVals(vals: number[][]): void {
    //iterate through the rows
    for (var row of vals) {
        var j: number;
        //we iterate up to second to last element to implement fencpost
        for (j = 0; j < row.length - 1; j++) {
            process.stdout.write(row[j] + ',');
        }
        //this prints the last element in row and goes to next line
        console.log(row[j]);
    }
}
