#!/usr/bin/env node

'use strict';

/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const beautify    = require('js-beautify').js_beautify;
const chalk       = require('chalk');
const fs          = require('fs-extra');
const path        = require('path');
const pkg         = require(__dirname+'/package.json');
const program     = require('commander');
const prompt      = require('prompt');
const slugify     = require('slugify');
const config      = require(__dirname+'/config.json');
const _           = require('underscore');
const prefix      = chalk.yellow('[butter]');
const exec        = require('child_process').exec;

/**
 * -----------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------
 */
const base        = path.resolve(process.cwd());
const log         = console.log;
const types       = ['atom', 'helper', 'molecule', 'organism', 'style', 'template'];

/**
 * -----------------------------------------------------------------------------
 * Initialize the CLI
 * -----------------------------------------------------------------------------
 */
program.version(pkg.version);


/**
 * -----------------------------------------------------------------------------
 * Functions
 * -----------------------------------------------------------------------------
 */
const createMaterial = (type, opt) => {

    type         = type || 'TYPE';
    let name     = slugify(opt['name']).toLowerCase();
    let dna      = opt['dna'] || 'DNA-ID';
    let id       = (opt.hasOwnProperty('group')) ? slugify(opt.group).toLowerCase() : name;
    id           = (type === 'helper') ? 'helpers' : id;
    let mpath    = base + '/' + config.src + '/materials/' + id;
    let mfile    = mpath + '/' + name + '.html';
    let mat      = fs.readFileSync(__dirname + '/templates/material.html', 'utf-8');
    mat          = mat.replace(/\$\{type\}/gi, type);
    mat          = mat.replace(/\$\{dna\}/gi, dna);
    let vpath    = base + '/' + config.src + '/views/';
    let vfile    = vpath + id + '.html';
    let view     = fs.readFileSync(__dirname + '/templates/view.html', 'utf-8');
    view         = view.replace(/\$\{id\}/gi, id);

    // Create the material file
    fs.ensureDirSync(mpath);
    if (!fs.existsSync(mfile)) {
        fs.writeFileSync(mfile, mat);
        log(prefix, 'created', type, name);
    } else {
        log(prefix, type, name, 'already exists');
    }

    // Create the view file
    fs.ensureDirSync(vpath);
    fs.writeFileSync(vfile, view);

    // Create the style sheet
    if (opt.style.length > 0) {
        let sopt     = _.clone(opt);
        sopt['name'] = opt.style;
        createStyle(opt);
    }
};
const createMaterialPrompt = (type, opt) => {
    let params = {};

    _.keys(opt._events).forEach((key) => {
        if (opt.hasOwnProperty(key)) {
            params[key] = opt[key];
        } else {
            delete params[key];
        }
    });

    let schema = {
        properties: {
            name: {
                required: true,
                description: chalk.yellow('Material name:'),
                message: 'Material name is required'
            },
            group: {
                required: false,
                description: chalk.yellow('Group name:'),
            },
            style: {
                required: false,
                description: chalk.yellow('Style sheet name:')
            },
            dna: {
                required: false,
                description: chalk.yellow('DNA ID:')
            }
        }
    };

    prompt.message = '  > ';
    prompt.delimiter = '';
    prompt.override = params;
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) {
            log(prefix, chalk.red('create error:'), err);
            process.exit();
        } else {
            createMaterial(type, result);
        }
    });
};

const createStyle = (opt) => {
    let name      = slugify(opt.name).toLowerCase();
    let theme     = opt['theme'] || config.theme;
    let spath     = base + '/' + config.src + '/assets/toolkit/styles/themes/' + theme + '/';
    let sfile     = spath + '_' + name + '.scss';
    let sspath    = base + '/' + config.src + '/assets/toolkit/styles/themes/' + theme + '/';
    let style     = fs.readFileSync(sspath + '_style.scss', 'utf-8');
    let fnd       = `@import '${name}'`;

    if (name === 'style') {
        log(prefix, 'create style error:', 'style is a reserved name');
        return;
    }

    fs.ensureDirSync(spath);
    if (!fs.existsSync(sfile)) {
        fs.writeFileSync(sfile, `/** ${name} styles **/`);
        log(prefix, 'created style sheet', '_'+name+'.scss');
    } else {
        log(prefix, 'style sheet', '_'+name+'.scss', 'already exists');
    }

    // Updated the theme > style.scss file
    if (style.indexOf(fnd) < 0) {

        let line    = fs.readFileSync(__dirname + '/templates/import.scss', 'utf-8');
        line        = line.replace(/\$\{name\}/gi, name);
        style       += line;

        fs.writeFileSync(sspath + '_style.scss', style);
    }
};
const createStylePrompt = (opt) => {

    let params = {};

    _.keys(opt._events).forEach((key) => {
        if (opt.hasOwnProperty(key)) {
            params[key] = opt[key];
        } else {
            delete params[key];
        }
    });

    let schema = {
        properties: {
            name: {
                required:    true,
                description: chalk.yellow('Style name:'),
                message:     'Style name is required'
            }
        }
    };

    prompt.message   = '  > ';
    prompt.delimiter = '';
    prompt.override  = params;
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) {
            log(prefix, chalk.red('create style error:'), err);
            process.exit();
        } else {
            createStyle(result);
        }
    });
};

const createTemplate = (opt) => {
    let name     = slugify(opt['name']).toLowerCase();
    let title    = name.replace(/-/gi, ' ');
    let tpath    = base + '/' + config.src + '/views/templates/';
    let tfile    = tpath + name + '.html';
    let tmp      = fs.readFileSync(__dirname + '/templates/page.html', 'utf-8');
    tmp          = tmp.replace(/\$\{title\}/gi, title);

    if (!fs.existsSync(tfile)) {
        fs.writeFileSync(tfile, tmp);
        log(prefix, 'created template:', tfile);
    } else {
        log(prefix, 'template', name, 'already exists');
    }

};
const createTemplatePrompt = (opt) => {

    let params = {};

    _.keys(opt._events).forEach((key) => {
        if (opt.hasOwnProperty(key)) {
            params[key] = opt[key];
        } else {
            delete params[key];
        }
    });

    let schema = {
        properties: {
            name: {
                required:    true,
                description: chalk.yellow('Template name:'),
                message:     'Template name is required'
            }
        }
    };

    prompt.message   = '  > ';
    prompt.delimiter = '';
    prompt.override  = params;
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) {
            log(prefix, chalk.red('create template error:'), err);
            process.exit();
        } else {
            createTemplate(result);
        }
    });
};


/**
 *
 * @function validType(type)
 *
 * @author Cam Tullos cam@tullos.ninja
 * @since 1.0.0
 *
 * @description Validates the material type is an atom, molecule, or organism.
 * @param type {String} The material type to validate.
 * @returns {Boolean}
 */
const validType = (type) => {
    if (!type) {
        return false;
    }
    type = String(type).toLowerCase();
    return (types.indexOf(type) > -1);
};



/**
 * -----------------------------------------------------------------------------
 * CLI Commands
 * -----------------------------------------------------------------------------
 */
program.command('create <type>')
    .description('Creates the specified material <type>: ' + types.join('|'))
    .option('-n, --name    <name>',  'the name of the material')
    .option('-g, --group   [group]', 'the group to add the new material to')
    .option('-s, --style   [style]', 'the style sheet to create')
    .option('-d, --dna     [dna]',   'the DNA-ID for the new material')
    .action((type, opt) => {
        if (validType(type) !== true) {
            log(prefix, 'error:', 'create <type> must be `' + types.join('`, `') + '`');
            return;
        }

        type = String(type).toLowerCase();

        switch (type) {
            case 'style':
                createStylePrompt(opt);
                break;

            case 'template':
                createTemplatePrompt(opt);
                break;

            default:
                createMaterialPrompt(type, opt);
        }
    })
    .on('--help', () => {
        log('  Examples:');
        log('    $ butter create molecule --name "btn-primary" --group "buttons" --style "button-primary" --dna "btn-primary"');

        // Extra line
        log('');
    });

program.command('set')
    .description('Set configuration key:value pairs')
    .option('-k, --key <key>', 'the configuration property to set ['+_.keys(config).join('|')+']')
    .option('-v, --value <value>', 'the configuration property value')
    .action((opt) => {
       config[opt.key] = opt.value;

       let cfile = __dirname + '/config.json';
       fs.writeFileSync(cfile, beautify(JSON.stringify(config)));

       log(prefix, 'updated config.json');
       log(fs.readFileSync(cfile, 'utf-8'));
    })
    .on('--help', () => {
        log('  Examples:');
        log('    $ butter set -k theme -v "my-theme"');

        // Extra line
        log('');
    });

program.command('eject <path>')
.description('Ejects the butter ~/dist/assets directory to the specified <path>')
.action((path) => {
    log(prefix, 'building assets...');

    // Run gulp build
    exec('gulp', (err) => {
        if (err) {
            log(prefix, err);
        } else {
            let src = base +'/dist/assets';

            log(prefix, 'copying assets...');
            fs.ensureDirSync(path);
            fs.copySync(src, path);

            // Remove unnecessary directories
            fs.removeSync(path + '/fabricator');
            fs.removeSync(path + '/toolkit/images/fpo');

            log(prefix, 'eject complete!');
        }
    });
})
.on('--help', () => {
    log('  Examples:');
    log('    $ butter eject "/Users/me/Desktop"');


    // Extra line
    log('');
});

/**
 * -----------------------------------------------------------------------------
 * DO NOT EDIT BELOW THIS LINE
 * -----------------------------------------------------------------------------
 */
program.parse(process.argv);

// output the help if nothing is passed
if (!process.argv.slice(2).length) {
    program.help();
}