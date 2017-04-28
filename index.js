#!/usr/bin/env node

'use strict';

/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const beautify      = require('js-beautify').js_beautify;
const chalk         = require('chalk');
const fs            = require('fs-extra');
const path          = require('path');
const pkg           = require(__dirname+'/package.json');
const program       = require('commander');
const prompt        = require('prompt');
const slugify       = require('slugify');
const config        = require(__dirname+'/config.json');
const _             = require('underscore');
const prefix        = chalk.yellow('[butter]');
const exec          = require('child_process').exec;
const spawn         = require('child_process').spawn;
const request       = require('request');
const decompress    = require('decompress');
const ora           = require('ora');

/**
 * -----------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------
 */
const base        = path.resolve(process.cwd());
const log         = console.log;
const types       = ['atom', 'helper', 'molecule', 'organism', 'style', 'template', 'page'];

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
const createMaterial = (type, opt, spinner) => {

    type           = type || 'TYPE';
    let name       = slugify(opt['name']).toLowerCase();
    let dna        = opt['dna'] || 'DNA-ID';
    let id         = (opt.hasOwnProperty('group')) ? slugify(opt.group).toLowerCase() : name;
    id             = (type === 'helper') ? 'helpers' : id;
    let mpath      = base + '/' + config.src + '/materials/' + id;
    let mfile      = mpath + '/' + name + '.html';
    let mat        = fs.readFileSync(__dirname + '/templates/material.html', 'utf-8');
    mat            = mat.replace(/\$\{type\}/gi, type);
    mat            = mat.replace(/\$\{dna\}/gi, dna);
    let vpath      = base + '/' + config.src + '/views/';
    let vfile      = vpath + id + '.html';
    let view       = fs.readFileSync(__dirname + '/templates/view.html', 'utf-8');
    view           = view.replace(/\$\{id\}/gi, id);

    if (!spinner) {

        spinner = ora({
            text:    'creating ' + type,
            spinner: 'dots',
            color:   'green'
        });

        spinner.start();
    }

    // Create the material file
    fs.ensureDirSync(mpath);
    if (!fs.existsSync(mfile)) {
        fs.writeFileSync(mfile, mat);
        spinner.text = `created ${type}`;
    } else {
        spinner.text = `${type} ${name} already exists`;
    }

    // Create the view file
    fs.ensureDirSync(vpath);
    fs.writeFileSync(vfile, view);

    // Create the style sheet
    if (opt.style.length > 0) {
        let sopt     = _.clone(opt);
        sopt['name'] = opt.style;
        createStyle(opt, spinner);
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

const createStyle = (opt, spinner) => {
    let name      = slugify(opt.name).toLowerCase();
    let theme     = opt['theme'] || config.theme;
    let spath     = base + '/' + config.src + '/assets/toolkit/styles/themes/' + theme + '/';
    let sfile     = spath + '_' + name + '.scss';
    let sspath    = base + '/' + config.src + '/assets/toolkit/styles/themes/' + theme + '/';
    let style     = fs.readFileSync(sspath + '_style.scss', 'utf-8');
    let fnd       = `@import '${name}'`;

    if (!spinner) {
        spinner = ora({
            text:    'creating ' + type,
            spinner: 'dots',
            color:   'green'
        });
        spinner.start();
    }

    if (name === 'style') {
        spinner.text = `create style error: style is a reserved name`;
        return;
    }

    fs.ensureDirSync(spath);
    if (!fs.existsSync(sfile)) {
        fs.writeFileSync(sfile, `/** ${name} styles **/`);
        spinner.text = `created style sheet _${name}.scss`;
    } else {
        spinner.text = `style sheet _${name}.scss already exists`;
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

const createTemplate = (opt, spinner) => {
    let name     = slugify(opt['name']).toLowerCase();
    let title    = name.replace(/-/gi, ' ');
    let tpath    = base + '/' + config.src + '/views/templates/';
    let tfile    = tpath + name + '.html';
    let tmp      = fs.readFileSync(__dirname + '/templates/page.html', 'utf-8');
    tmp          = tmp.replace(/\$\{title\}/gi, title);

    if (!spinner) {
        spinner = ora({
            text:    'creating ' + type,
            spinner: 'dots',
            color:   'green'
        });

        spinner.start();
    }

    if (!fs.existsSync(tfile)) {
        fs.writeFileSync(tfile, tmp);
        spinner.text = 'created template: ' + tfile;
    } else {
        spinner.text = `template ${name}.html already exists`;
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

const createPage = (opt, spinner) => {
    if (!spinner) {

        spinner = ora({
            text:    'creating ' + type,
            spinner: 'dots',
            color:   'green'
        });

        spinner.start();
    }

    let path = `${base}/data`;
    let file = path + '/pages.json';

    fs.ensureDirSync(path);

    let data;

    if (fs.existsSync(file)) {
        let fdata = fs.readFileSync(file, 'utf-8');
        data = JSON.parse(fdata);
    } else {
        data = [];
    }

    if (!_.findWhere(data, {label: opt.label})) {
        data.push({url: opt.url, label: opt.label});

        let output    = JSON.stringify(data);
        output        = beautify(output);

        fs.writeFileSync(file, output);

        spinner.text = `create page ${opt.label}`;
    } else {
        spinner.text = `page ${opt.label} already exists`;
    }

};
const createPagePrompt = (opt) => {

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
            url: {
                required:    true,
                description: chalk.yellow('URL:'),
                message:     'URL is required'
            },
            label: {
                required:    true,
                description: chalk.yellow('Label Text:'),
                message:     'Label text is required'
            }
        }
    };

    prompt.message   = '  > ';
    prompt.delimiter = '';
    prompt.override  = params;
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) {
            log(prefix, chalk.red('page error:'), err);
            process.exit();
        } else {
            _.keys(prompt.override).forEach((key) => { result[key] = prompt.override[key]; });
            createPage(result);
        }
    });
};

const install = {
    spinner: null,

    init: (opt) => {
        let params      = {};
        let contents    = [];

        _.keys(opt._events).forEach((key) => {
            if (opt.hasOwnProperty(key)) {
                params[key] = opt[key];
            } else {
                delete params[key];
            }
        });


        fs.readdirSync(base).forEach((dir) => { if (dir.substr(0, 1) !== '.') { contents.push(dir); } });

        if (contents.length > 0 && params.overwrite !== true) {
            delete params['overwrite'];
        } else {
            params['overwrite'] = true;
        }

        install.prompt(params);
    },

    prompt: (opt) => {
        let schema = {
            properties: {
                username: {
                    description: chalk.yellow('Username:'),
                },
                password: {
                    description: chalk.yellow('Password:')
                }
            }
        };

        if (opt['overwrite'] !== true) {
            schema.properties['overwrite'] = {
                description: chalk.yellow('The install directory is not empty. Do you want to overwrite it?'),
                default:     'Y/N',
                conform:     function (answer) {
                    if (answer.toLowerCase() !== 'y') {
                        log(prefix, chalk.red('install cancelled'));
                        process.exit();
                    } else {
                        return true;
                    }
                }
            }
        }

        prompt.message      = '  > ';
        prompt.delimiter    = '';
        prompt.override     = opt;
        prompt.start();
        prompt.get(schema, (err, result) => {
            if (err) {
                log(prefix, chalk.red('install error:'), err);
                process.exit();
            } else {
                result['overwrite'] = Boolean(result.overwrite === 'y');
                _.keys(prompt.override).forEach((key) => { result[key] = prompt.override[key]; });
                install.start(result);
            }
        });
    },

    start: (opt) => {
        install.spinner = ora({
            text:    'downloading, this may take awhile...',
            spinner: 'dots',
            color:   'green'
        });

        install.spinner.start();

        // Create the tmp directory if it doesn't exist.
        fs.ensureDirSync(`${base}/tmp`);

        // Download the most recent version of jam
        request(config.install)
        .pipe(fs.createWriteStream(`${base}/tmp/butter.zip`))
        .on('close', function () {
            install.spinner.text = 'download complete!';

            // next -> unzip
            setTimeout(install.unzip, 2000, opt);
        });
    },

    unzip: (opt) => {
        install.spinner.text = 'unzipping...';

        decompress(`${base}/tmp/butter.zip`, base, {strip: 1}).then(() => {
            // Delete the tmp directory
            fs.removeSync(`${base}/tmp`);
            if (opt['username'] && opt['password']) {
                install.lockdown(opt);
            } else {
                install.npm(opt);
            }
        });
    },

    lockdown: (opt) => {
        install.spinner.text = 'securing...';
        fs.writeFileSync(`${base}/.htpasswd`, `${opt.username}:${opt.password}`);
        install.npm(opt);
    },

    npm: (opt) => {
        install.spinner.text    = 'installing dependencies, this may take awhile...';
        let pi                  = false;
        let snpm                = spawn('npm', ['install']);

        snpm.stdout.on('data', (data) => {
            let txt    = data.toString();
            txt        = txt.replace(/\r?\n|\r/g, '');

            if (txt.indexOf('post_install.js') > -1 && pi !== true) { pi = true; }
            if (pi === true) { return; }

            txt = (txt.indexOf('│') > -1) ? 'dependency install complete!' : txt;

            install.spinner.text = txt;
        });

        snpm.stdout.on('error', (err) => {
            install.spinner.fail(err);
        });

        snpm.stdout.on('close', () => {
            install.build(opt);
        });
    },

    build: () => {
        install.spinner.text = 'building...';

        let gulp = spawn('gulp');
        gulp.stdout.on('data', (data) => {
            let txt    = data.toString();
            txt        = txt.replace(/\r?\n|\r/g, '');
            install.spinner.text = txt;
        });

        gulp.stdout.on('error', (err) => {
            spinner.fail(err);
        });

        gulp.stdout.on('close', () => {
            install.spinner.text = 'build complete';
            setTimeout(install.complete, 1000);
        });
    },

    complete: () => {
        install.spinner.succeed('install complete!');
        log(prefix, 'run `butter launch` to start the dev environment');
    }
};

const ejectPrompt = (path) => {

    if (path) {
        eject(path);
    } else {
        let schema = {
            properties: {
                path: {
                    url: {
                        required:    true,
                        description: chalk.yellow('Output directory:'),
                        message:     'path is a required parameter'
                    }
                }
            }
        };

        prompt.message   = '  > ';
        prompt.delimiter = '';
        prompt.start();
        prompt.get(schema, (err, result) => {
            if (err) {
                log(prefix, chalk.red('eject error:'), err);
                process.exit();
            } else {
                eject(result['path']);
            }
        });
    }
};
const eject = (path) => {

    let spinner = ora({
        text       : 'ejecting assets...',
        spinner    : 'dots',
        color      : 'green'
    });

    log('');

    spinner.start();

    let gulp = spawn('gulp');
    gulp.stdout.on('data', (data) => {
        let txt         = data.toString();
        txt             = txt.replace(/\r?\n|\r/g, '');
        txt             = txt.replace( /-+/g, '-');
        txt             = String(txt).trim();
        spinner.text    = txt;
    });

    gulp.stdout.on('error', (err) => {
        spinner.fail(err);
    });

    gulp.stdout.on('close', () => {
        let src = base +'/dist/assets';

        spinner.text = 'copying assets...';

        fs.ensureDirSync(path);
        fs.copySync(src, path);

        // Remove unnecessary directories
        fs.removeSync(path + '/fabricator');
        fs.removeSync(path + '/toolkit/images/fpo');

        spinner.succeed('eject complete!');
        log('');
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

program.command('install')
.description('Installs butter in the current directory: ' + base)
.option('-o, --overwrite [overwrite]', 'overwrite the install path')
.option('-u, --username [username]', 'basic auth username')
.option('-p, --password [password]', 'basic auth password')
.action(install.init)
.on('--help', () => {
    log('  Examples:');
    log('    $ butter install --overwrite');

    // Extra line
    log('');
});

program.command('create <type>')
.description('Creates the specified <type>: ' + types.join('|'))
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

    let spinner = ora({
        text:    'creating ' + type,
        spinner: 'dots',
        color:   'green'
    });
    spinner.start();

    switch (type) {
        case 'style':
            createStylePrompt(opt, spinner);
            break;

        case 'template':
            createTemplatePrompt(opt, spinner);
            break;

        default:
            createMaterialPrompt(type, opt, spinner);
    }

    spinner.succeed(`create complete!`);
})
.on('--help', () => {
    log('  Examples:');
    log('    $ butter create molecule --name "btn-primary" --group "buttons" --style "button-primary" --dna "btn-primary"');

    // Extra line
    log('');
});

program.command('launch')
.description('Launch Butter and listen for changes')
.action(() => {
    let spinner = ora({
        text       : 'Launching Butter...',
        spinner    : 'dots',
        color      : 'green'
    });

    log('');

    spinner.start();

    let msg     = 'Running Butter: Press ctrl + c to exit  ';
    let gulp    = spawn('gulp', ['--dev']);

    gulp.stdout.on('data', function (data) {
        let txt    = data.toString();
        txt        = txt.replace(/\r?\n|\r/g, '');
        txt        = txt.replace( /-+/g, '-');
        txt        = (txt.indexOf('waiting for changes before restart') > -1) ? msg : txt;
        txt        = txt.replace(/\[(.+?)\]/g, '');
        txt        = String(txt).trim();
        txt        = (txt.indexOf('UI External') > -1) ? msg : txt;
        txt        = (txt.length < 3) ? msg : txt;

        spinner.text = txt;
    });

    process.on('SIGINT', function () {
        gulp.kill();

        spinner.succeed('Butter terminated');
        log('');

        process.exit();
    });
})
.on('--help', () => {
    log('  Examples:');
    log('    $ butter launch');

    // Extra line
    log('');
});

program.command('build')
.description('Build Butter')
.action(() => {

    let spinner = ora({
        text       : 'building assets...',
        spinner    : 'dots',
        color      : 'green'
    });

    log('');

    spinner.start();

    let gulp    = spawn('gulp');
    gulp.stdout.on('data', (data) => {
        let txt         = data.toString();
        txt             = txt.replace(/\r?\n|\r/g, '');
        txt             = txt.replace( /-+/g, '-');
        txt             = String(txt).trim();
        spinner.text    = txt;
    });

    gulp.stdout.on('error', (err) => {
        spinner.fail(err);
    });

    gulp.stdout.on('close', () => {
        spinner.succeed('build complete!');
        log('');
    });
})
.on('--help', () => {
    log('  Examples:');
    log('    $ butter build');

    // Extra line
    log('');
});

program.command('eject [path]')
.description('Ejects the butter ~/dist/assets directory to the specified [path]')
.action(ejectPrompt)
.on('--help', () => {
    log('  Examples:');
    log('    $ butter eject "/Users/me/Desktop"');


    // Extra line
    log('');
});

program.command('page')
.description('Adds a link to the Butter > Pages Menu')
.option('-u, --url [url]',  'the url of the page')
.option('-l, --label [label]',  'the link label text')
.action(createPagePrompt)
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