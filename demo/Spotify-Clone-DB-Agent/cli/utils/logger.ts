import chalk from 'chalk';

export class Logger {
  private spinnerText: string | null = null;

  // Basic logging methods
  info(message: string): void {
    console.log(chalk.blue(''), message);
  }

  success(message: string): void {
    console.log(chalk.green(''), message);
  }

  error(message: string): void {
    console.log(chalk.red(''), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow(''), message);
  }

  // Spinner methods for long-running operations (simplified)
  startSpinner(text: string): void {
    this.spinnerText = text;
    console.log(chalk.blue(''), text);
  }

  updateSpinner(text: string): void {
    this.spinnerText = text;
    console.log(chalk.blue(''), text);
  }

  stopSpinner(): void {
    this.spinnerText = null;
  }

  // Special methods for agent activities
  thinking(message: string): void {
    console.log(chalk.magenta(''), chalk.italic(`Agent thinking: ${message}`));
  }

  analyzing(message: string): void {
    console.log(chalk.cyan(''), chalk.italic(`Analyzing: ${message}`));
  }

  generating(message: string): void {
    console.log(chalk.yellow(''), chalk.italic(`Generating: ${message}`));
  }

  writing(filename: string): void {
    console.log(chalk.green(''), chalk.italic(`Writing file: ${filename}`));
  }

  executing(command: string): void {
    console.log(chalk.blue(''), chalk.italic(`Executing: ${command}`));
  }

  // Progress tracking
  progress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = ''.repeat(Math.round(percentage / 5)) + ''.repeat(20 - Math.round(percentage / 5));
    console.log(chalk.cyan(`[${progressBar}] ${percentage}%`), message);
  }

  // Formatted output methods
  section(title: string): void {
    console.log('\n' + chalk.bold.underline(title));
  }

  subsection(title: string): void {
    console.log('\n' + chalk.bold(title));
  }

  listItem(item: string): void {
    console.log(chalk.gray('  •'), item);
  }

  codeBlock(code: string, language: string = ''): void {
    console.log(chalk.gray('```' + language));
    console.log(chalk.white(code));
    console.log(chalk.gray('```'));
  }

  // Agent status methods
  agentStatus(status: 'idle' | 'thinking' | 'analyzing' | 'generating' | 'writing' | 'executing'): void {
    const statusEmojis = {
      idle: '💤',
      thinking: '🤔',
      analyzing: '🔍',
      generating: '⚡',
      writing: '📝',
      executing: '🔧'
    };

    const statusColors = {
      idle: chalk.gray,
      thinking: chalk.magenta,
      analyzing: chalk.cyan,
      generating: chalk.yellow,
      writing: chalk.green,
      executing: chalk.blue
    };

    console.log(statusEmojis[status], statusColors[status](`Agent Status: ${status}`));
  }

  // Clear screen method
  clear(): void {
    console.clear();
  }

  // Print separator
  separator(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }
} 