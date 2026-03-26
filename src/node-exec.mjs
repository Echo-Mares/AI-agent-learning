import { spawn } from 'child_process';

const command = 'echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts';
const cwd = process.cwd();


const [cmd, ...args] = command.split(' ');

const child = spawn(cmd, args, { 
  cwd,
  stdio: 'inherit', // 实时输出到控制台
  shell: true //使用shell来执行命令
});


let errorMsg = ''; // 用于保存错误信息的变量

child.on('error', (err) => {
  errorMsg = err // 错误信息保存到变量中，稍后在close事件中输出
});

child.on('close', (code) => {
  if (code === 0) {
    process.exit(0); // 成功执行，退出码为0
  } else {
    console.error(`命令执行失败，退出码: ${code}`); // 输出退出码
    if (errorMsg) {
      console.error(`错误信息: ${errorMsg}`); // 输出错误信息
    }
    process.exit(1); // 非零退出码表示失败
  }
});