mac系统操作前面需加sudo

环境配置：
安装nodejs，版本v0.10.33
安装jello  npm install -g jello 
安装sass  npm install -g fis-parser-sass 

本地开发命令：
代码开发从master上面切分支，任何改动只能在分支上做，master在发布上线前不能动。
(sudo) python run.py dev  //本地代码编译
(sudo) jello server start -p 80 //本地服务开启

测试命令：
git clone git@gitlab.youjie.com:szgroup/yy_app_api.git 
（maste分支，maste分支不能动，具体分支需要问后台同事）
切换yy_app_api到开发分支

(sudo) python run.py qa（h5项目）
执行git操作，
git pull
git add .
git commit -m
git push



上线命令：
在master分支上执行命令
git merge branch-name
(sudo) python run.py www
在gitlab上面查看提交记录，确保需要上线的改动都已提交。
http://gitlab.youjie.com/fe-release-group/fenqi-h/commits/master