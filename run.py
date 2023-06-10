#coding:utf-8
import os,sys,platform,subprocess,time

#判断当前系统
isWindows = 'Windows' == platform.system()

bakTmp = '../__dist/'

#前端项目名
project = 'fenqi-h'

#后端分支模板所在目录
beRelease = '../yy-h5/yy-h5-web/src/main/webapp/WEB-INF/views'

#前端上线发布分支所在目录
feRelease = '../fe-release-group/'

#前端上线发布分支地址
feReleaseGit = 'git@gitlab.szyy.com:fe-release-group/fenqi-h.git'

#初始化目录
def initDir():
    if not os.path.exists(feRelease):
        exeCmd('mkdir ' + feRelease)

#获取当前git分支
def getGitBranch():
    branches = subprocess.check_output(['git', 'branch']).split('\n')
    for b in branches[0:-1]:
        if b[0] == '*':
            return b.lstrip('* ')

    return None


def exeCmd(cmd):
    if (not isWindows) and ( ('jello' in cmd) or ('rm' in cmd) or ('scp' in cmd)):
        cmd = 'sudo ' + cmd

    print '------------------------------------------------------'
    print cmd
    os.system(cmd)

def releaseDev():
    print 'release to dev'
    exeCmd('jello release -wc')

def releaseQa():
    print 'release to 172.28.28.32 start...'

    #删除遗留的__dist
    exeCmd('rm -rf ' + bakTmp)

    #进行打包编译
    cmd = 'jello release -cD -d ' + bakTmp
    exeCmd(cmd)

    #把vm文件拷贝到后端工程
    #cmd = 'scp -r ' + bakTmp + 'WEB-INF/views/page' + ' ' + beRelease
    #exeCmd(cmd)

    #拷贝静态资源到测试服务器
    # 28.32
    cmd = 'rsync -azvP --delete ' + bakTmp + project + ' user_h5@172.28.28.32:/opt/soft/tengine/html/yyfqstatic'
    exeCmd(cmd)
    # 3.21
    cmd = 'rsync -azvP --delete ' + bakTmp + project + ' user_h5@172.28.3.21:/share/yyfq/'
    exeCmd(cmd)

    cmd = 'rm -rf ' + bakTmp
    exeCmd(cmd)

    print 'release to 172.28.28.32 end'

def releaseOnline():
    print 'release to fe-release start...'

    #检测是否在master分支
    if getGitBranch() != 'master':
        print 'please merge to master!'
        return

    #删除遗留的__dist
    exeCmd('rm -rf ' + bakTmp)

    #进行打包编译
    cmd = 'jello release -comD -d ' + bakTmp
    exeCmd(cmd)

    #删除原有release目录并且clone最新的
    currPath = os.getcwd()
    os.chdir(os.path.join(currPath, feRelease))

    exeCmd('rm -rf ' + project)
    exeCmd('git clone ' + feReleaseGit)

    #将打包编译的文件拷贝到fe-release
    os.chdir(currPath)
    exeCmd('rm -rf ' + os.path.join(feRelease, project, "*"))

    cmd = 'scp -r ' + os.path.join(bakTmp, project, '*') + ' ' + os.path.join(feRelease, project)
    exeCmd(cmd)

    cmd = 'scp -r ' + os.path.join(bakTmp, 'WEB-INF/views/page') + ' ' + os.path.join(feRelease, project)
    exeCmd(cmd)

    #切到fe-release git push
    os.chdir(os.path.join(currPath, feRelease, project))
    exeCmd('git add .')
    exeCmd('git commit -m "auto commit" *')
    exeCmd('git push')

    #打tag
    exeCmd('git tag www/' + project + '/' + time.strftime('%Y%m%d.%H%M'))
    exeCmd('git push --tags')

    #切回到当前目录
    os.chdir(currPath)
    cmd = 'rm -rf ' + bakTmp
    exeCmd(cmd)

    print 'release to fe-release end'

def main():
    initDir()

    argv = sys.argv
    if len(argv) == 1:
        exeCmd('jello server start -p 80')
        return

    cmdType = sys.argv[1]

    if cmdType == 'dev':
        releaseDev()

    elif cmdType == 'qa':
        releaseQa()

    elif cmdType == 'www':
        releaseOnline()

    else:
        print 'please choose one : dev,qa,www'

if __name__ == "__main__":
    main()
