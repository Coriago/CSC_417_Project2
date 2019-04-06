#!/usr/bin/env node

import * as fs from "fs";

//Table class to hold all of the info from the csv
class table {
    //Number of columns
    cols: number;
    //Number of rows
    rows: number;
    //Holder c
    enough: number;
    //Filed for c
    c: number;
    //Headers of the table
    attributes: Array<String>;
    //Array to store the data from the CSV file
    data: string[][];

    //Constructor
    constructor() {
        this.cols = 0;
        this.rows = 0;
        this.enough = 0.5;
    }

    //Functin to set the data
    dataSet(newData: string[][]){
        this.data = newData;
        this.cols = this.data[0].length - 1;
        this.c = this.cols - 1;
        this.rows = this.data.length - 1;
        this.enough = this.rows**this.enough;
    }

    //Function to print the fields for testing
    print() {
        console.log("Cols: " + this.cols);
        console.log("Rows: " + this.rows);
        console.log("C: " + this.c);
        console.log("Enough: " + this.enough);
        console.log("Attributes: " + this.attributes);
    }
}

/*
 * Function which reads in the table from standard in and saves it to the 
 * passed in table object.
 * This function was provided by Daniel Mills
 */
function readInput(dataTable: table) {
    var data:Array<String> = fs.readFileSync( '/dev/stdin', 'utf8' ).split( "\n" );
    dataTable.attributes = data[ 0 ].split( "," );
    dataTable.dataSet(data.slice( 1, data.length - 1).map( 
        line => line.split(",").map(String)
    ));
}

/*
 * This function recursively cuts the table into best and the rest. It uses the argmin
 * values provided from the previous filter to know where to cut.
 * It takes a table, holding the csv data, as a parameter, as well as the low
 * number to cut at, the high number to cut at and the string to use when
 * printing.
 */
function cuts(input: table, low: number, high: number, pre: string) {
    //Concatinate the preface with the last value
    let tbPrint:string = pre.concat(input.data[low][input.c]);
    process.stderr.write(tbPrint + "\n");
    if(high - low > input.enough) {
        //Grab cut from the last column of the high row
        let cut:number = Number(input.data[low][input.cols]);
        if(cut && cut <= input.rows) {
            return cuts(input, cut + 1, high, pre.concat("|.."));
        }
    }
    mark(input, 1, low - 1);
    mark(input, low, high);
}

/*
 * This function sets the band value as the last col of each row.
 * It takes a table, holding the csv data, as a parameter, as well as the low
 * number to cut at and the high number to cut at.
 */
function mark(input: table, low: number, high: number) {
    let b = band(input, low, high);
    let i:number;
    for(i = low; i <= high; i++ ) {
        input.data[i][input.cols] = b
    }
}

/*
 *This function formats the output of the respective bands
 * It takes a table, holding the csv data, as a parameter, as well as the low
 * number to cut at and the high number to cut at.
 */
function band(input: table, low: number, high: number) {
    process.stdout.write("band\n");
    if(low == 1) {
        return ("..").concat(String(input.data[high][input.c]));
    } else {
        return String(input.data[low][input.c]).concat("..", String(input.data[high][input.c]));
    }
}

//Create an instance of table
var csv = new table();
//Parse the CSV file from standard in and move the data over to the data object
readInput(csv);
//Write to standard error
process.stderr.write("\n-- ".concat(String(csv.attributes[csv.c]), "----------\n"));
//Divide the data into best and the rest
cuts(csv, 0, csv.rows, "|.. ");
//For loop to print the headers of the table to standard out
for( var j = 0; j < csv.c; j++) {
    process.stdout.write(csv.attributes[j] + ",");
}
process.stdout.write(csv.attributes[j] + ", !klass" + "\n");
//For loop to print the table to standard out
for( var i = 0; i < csv.rows; i++) {
    for( var j = 0; j < csv.cols; j++) {
        process.stdout.write(csv.data[i][j] + ",");
    }
    process.stdout.write(csv.data[i][j] + "\n");
}
