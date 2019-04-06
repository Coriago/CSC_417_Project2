# CSC_417_Project2
Brooks pipe line project. Rewrite a filter in the Brooks pipeline in another language.
Bestrest is replaced by our new pipeline written in TypeScript

This is the overview of the new pipeline:
`dom | node sortlastcol.js | node argmin.js | node Pipe3.js`

1.) To run first go into the 2a folder and run `chmod +x run`.

2.) Now enter `./run` which will install all dependancies. The directory should now be in the src folder and ide started.

3.) From here you can use `./run` again to run the canned input into our pipeline or regenerate using `./run2`. 

run.in - contains the input to the our bestrest pipeline from dom
run.out - contains the output of the bestrest pipeline
