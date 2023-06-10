//开启sass
fis.config.set('modules.parser', {
     sass : 'sass',
     scss: 'sass'
});

fis.config.set('roadmap.ext', {
    sass: 'css',
    scss: 'css'
});

fis.config.set("project.watch.usePolling", true);

var project = '/fenqi-h'
fis.config.merge({
    statics : project + '/static',
    roadmap : {
        domain : '//s1.yyfq.com'
    }
});


var isWatch = process.title.split(' ')[2].indexOf('w') != -1

var myWatch = function (){
    var fs = require('fs')
    var table = {}

    function toWatch(f1){
        if (!isWatch){
            return false
        }

        //最多2s触发一次watch改动
        var isPlay = false

        fs.watch(f1, function (){
            if (isPlay){
                return false
            }
            isPlay = true
            setTimeout(function (){
                isPlay = false
            }, 2000)

            var f2List = table[f1]
            f2List.forEach(function (f2){
                fs.utimes(f2, new Date, new Date)
                console.log('touch ' + f2)
            })
        })
    }

    function watch (f1, f2){
        if (f1 in table){
            if (table[f1].indexOf(f2) == -1){
                table[f1].push(f2)
            }
        }
        else {
            table[f1] = [f2]
            toWatch(f1)
        }
    }

    return {watch:watch}
}()

//fis 插件，模拟browserfiy的require
fis.config.set('modules.parser.js', function (content, file, settings){

    var fs = require('fs')
    var path = require('path')
    var crypto = require('crypto')

    var modTable = []
    var modLinkTable = {}
    var scanReg = /require\(['|"](.*?)['|"]\)/g

    function getMd5(str){
        var md5 = crypto.createHash('md5')
        md5.update(str)

        var md58 = md5.digest('hex').slice(-8)

        //有一定几率出现md58是纯数字，但是firefox不支持window['123']的情况，所以加前缀
        if (/^\d+$/.test(md58)){
            md58 = 'ml-' + md58
        }

        return md58
    }

    function getFullPath(p){
        var fullPath = path.join(__dirname, p)
        return fullPath
    }

    function getModFile(p){
        var fullPath = getFullPath(p)
        var content = fs.readFileSync(fullPath) + ''

        var windowFunc = 'window["' + getMd5(p.replace(/\\/g, '/')) + '"]'

        //如果是tpl文件
        if (p.slice(-4) == '.tpl'){
            return '//#----------------mod start----------------\n' +
                windowFunc + '= \'' + content.replace(/\r?\n\s*/g, '') + '\'\n' +
                '//#----------------mod end----------------\n\n'
        }

        //如果是js文件
        if (p in modLinkTable){
            for (var relpath in modLinkTable[p]){
                var abspath = modLinkTable[p][relpath]
                content = content.replace(RegExp(relpath, 'g'), getMd5(abspath.replace(/\\/g, '/')))
            }
        }

        return '//#----------------mod start----------------\n' +
            'void function (module){\n\t' +
            windowFunc + '={};\n' +
            content.replace(/module\.exports/g, windowFunc).replace(/(^|\n)/g, '\n\t') +
            '\n}({exports:{}})\n' +
            '//#----------------mod end----------------\n\n'
    }

    function fillModLinkTable(subpath, requireNameA, requireNameB){
        if (!(subpath in modLinkTable)){
            modLinkTable[subpath] = {}
        }

        modLinkTable[subpath][requireNameA] = requireNameB
    }

    function scanMod(subpath){
        var modTable2 = []
        var modContent = fs.readFileSync(getFullPath(subpath)) + '';

        var execValue
        while ( (execValue = scanReg.exec(modContent)) != null ){
            var requireName = execValue[1]
            var modPath

            //如果rquire的是绝对路径
            if (requireName[0] == '/'){
                modPath = path.join(requireName)
            }
            else {
                modPath = path.join(path.dirname(subpath), requireName)
            }
            fillModLinkTable(subpath, requireName, modPath)
            modTable2.unshift(modPath)
        }

        modTable2.forEach(function (mod){
            var idx = modTable.indexOf(mod)
            if (idx != -1){
                modTable.splice(idx, 1)
            }
            modTable.unshift(mod)
            scanMod(mod)
        })
    }

    //1、是js文件。2、文件名不能下划线打头(下划线的不被release出去)。3、min.js结尾的文件都直接被<script src>
    if ( (file.filename[0] != '_') && (file.filename.slice(-4) != '.min') ){
        //console.log(file)

        modTable = []
        modLinkTable = {}
        scanMod(file.subpath)

        //把mods声明放到最前
        var modsContent = ''

        modTable.forEach(function (mod){
            modsContent += getModFile(mod)
            myWatch.watch(getFullPath(mod), file.fullname)
        })

        content = modsContent + getModFile(file.subpath)

        //替换所有require
        content = content.replace(scanReg, function (match, value){
            return 'window["' + value + '"]'
        })

    }

    return content
})
