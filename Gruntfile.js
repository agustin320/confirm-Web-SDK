module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        connect: {
            example: {
                port: 3001,
                base: './'
            }
        }
    });

    grunt.loadNpmTasks('grunt-connect');
    grunt.registerTask('default', 'connect:example');

};
