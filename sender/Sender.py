# -*- coding: utf-8 -*-
"""OA系统通知邮件发送模块

该模块负责将OA系统中爬取的通知内容通过邮件发送给指定收件人。
主要功能包括：
1. 定位目标通知文件（支持指定日期、前一天或最新文件）
2. 读取收件人邮箱列表
3. 生成美观的HTML格式邮件内容
4. 通过SMTP协议发送邮件
5. 处理发送过程中的异常情况

使用方法：
- 直接运行：默认发送前一天的通知
- 指定日期：python Sender.py --date YYYY-MM-DD

配置依赖：
- 需要在环境变量或配置文件中设置SMTP服务器信息
- 需要recipient_list_file文件包含收件人邮箱列表
- 依赖通知文件存储在events_dir目录下
"""
import argparse
import datetime
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
import sys

# 添加项目根目录到Python路径
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from config.config import Config


class Sender:
    """OA系统通知邮件发送器
    
    该类负责将OA系统爬取的通知内容以美观的HTML格式邮件发送给指定的收件人列表。
    支持以下功能：
    - 自动定位目标通知文件（指定日期、前一天或最新文件）
    - 读取并验证收件人邮箱列表
    - 生成响应式HTML格式的邮件内容
    - 通过SMTP协议安全发送邮件
    - 详细记录发送过程和异常情况
    """

    def __init__(self, target_date: str | None = None) -> None:
        """初始化发送器
        
        参数：
            target_date: 指定要发送的通知日期，格式为 YYYY-MM-DD
                        如果为 None，则默认发送前一天的通知
        
        初始化过程：
            1. 创建配置对象
            2. 确保必要的目录结构存在
            3. 设置事件文件目录
            4. 保存目标日期参数
        """
        self.config = Config()  # 创建配置对象，读取系统配置
        self.config.ensure_directories()  # 确保必要的目录结构存在
        self.events_dir = self.config.events_dir  # 设置事件文件存储目录
        self.target_date = target_date  # 保存目标日期参数

    def run(self) -> None:
        """启动邮件发送流程
        
        这是 Sender 类的主要入口方法，负责：
        1. 打印开始处理的日志信息
        2. 调用 _process_new_files 方法执行具体的文件处理和邮件发送逻辑
        3. 打印处理完成的日志信息
        """
        print("开始处理OA通知并发送邮件...")  # 打印开始处理的日志
        self._process_new_files()  # 执行具体的文件处理和邮件发送逻辑
        print("处理完成")  # 打印处理完成的日志

    def _get_smtp_credentials(self) -> tuple[str | None, str | None]:
        """获取SMTP服务器的认证信息
        
        从配置对象中获取SMTP服务器的用户名和密码，并进行验证。
        
        返回：
            tuple[str | None, str | None]: 包含用户名和密码的元组
                - 如果配置完整，返回 (smtp_user, smtp_password)
                - 如果配置不完整，返回 (None, None)
        """
        smtp_user = self.config.smtp_user  # 从配置中获取SMTP用户名
        smtp_password = self.config.smtp_password  # 从配置中获取SMTP密码
        if not smtp_user or not smtp_password:  # 检查配置是否完整
            print("未在配置中找到SMTP用户名或密码，请检查env文件或环境变量")  # 打印配置缺失提示
            return None, None  # 返回None表示配置不完整
        return smtp_user, smtp_password  # 返回完整的认证信息

    @staticmethod
    def _generate_html(data, date: str) -> str:
        """生成邮件的HTML内容
        
        该方法创建一个美观、响应式的HTML页面，用于展示OA通知内容。
        主要特点：
        - 使用CSS变量定义主题颜色，便于维护
        - 响应式设计，适配不同设备屏幕
        - 卡片式布局，每个通知独立展示
        - 悬停效果增强用户体验
        
        参数：
            data: 包含通知内容的列表，每个通知包含标题、链接、发布单位和摘要
            date: 通知的日期字符串，格式为 YYYY-MM-DD
            
        返回：
            str: 生成的完整HTML内容字符串
        """
        html_content = f"""
        <html>
        <head>
            <style>
                :root {{
                    --primary-color: #2c3e50;
                    --secondary-color: #3498db;
                    --text-color: #333;
                    --light-text: #777;
                    --border-color: #eaeaea;
                    --background-color: #f9f9f9;
                    --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: var(--text-color);
                    background-color: var(--background-color);
                    margin: 0;
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }}
                h1 {{
                    color: var(--primary-color);
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color);
                }}
                .notification-container {{
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 20px;
                }}
                .notification {{
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: var(--card-shadow);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }}
                .notification:hover {{
                    transform: translateY(-3px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }}
                .title {{
                    font-size: 17px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }}
                .title a {{
                    color: var(--primary-color);
                    text-decoration: none;
                    transition: color 0.2s ease;
                }}
                .title a:hover {{
                    color: var(--secondary-color);
                    text-decoration: underline;
                }}
                .unit {{
                    font-size: 14px;
                    color: var(--light-text);
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed var(--border-color);
                }}
                .summary {{
                    font-size: 14px;
                    line-height: 1.5;
                }}
                @media (max-width: 768px) {{
                    .notification-container {{
                        grid-template-columns: 1fr;
                    }}
                }}
            </style>
        </head>
        <body>
            <h1>{date} 通知汇总</h1>
            <div class="notification-container">
        """
        for item in data:
            html_content += f"""
            <div class="notification">
                <div class="title"><a href="{item['链接']}">{item['标题']}</a></div>
                <div class="unit">{item['发布单位']}</div>
                <div class="summary">{item['摘要']}</div>
            </div>
            """
        html_content += """
            </div>
        </body>
        </html>
        """
        return html_content

    def _send_email(self, file_path: Path, recipient_email: str, smtp_user: str, smtp_password: str) -> bool:
        """发送邮件通知
        
        该方法负责将指定日期的OA通知通过邮件发送给单个收件人，主要步骤：
        1. 读取通知JSON文件内容
        2. 验证文件是否包含数据
        3. 生成HTML格式的邮件内容
        4. 创建邮件对象并设置相关属性
        5. 连接SMTP服务器并发送邮件
        6. 处理可能的异常情况
        
        参数：
            file_path: 通知JSON文件的路径
            recipient_email: 收件人的邮箱地址
            smtp_user: SMTP服务器的用户名
            smtp_password: SMTP服务器的密码
            
        返回：
            bool: 发送成功返回True，失败返回False
        """
        try:
            date = file_path.stem  # 从文件名获取日期
            with file_path.open('r', encoding='utf-8') as file:  # 打开并读取JSON文件
                data = json.load(file)  # 解析JSON数据

            if not data:  # 检查文件是否包含数据
                print(f"文件 {file_path} 不包含数据，跳过为 {recipient_email} 发送邮件")
                return False

            html_content = self._generate_html(data, date)  # 生成HTML格式邮件内容

            msg = MIMEMultipart()  # 创建多部分邮件对象
            msg['From'] = smtp_user  # 设置发件人
            msg['To'] = recipient_email  # 设置收件人
            msg['Subject'] = f'{date} OA通知汇总'  # 设置邮件主题
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))  # 附加HTML内容

            # 连接SMTP服务器并发送邮件
            server = smtplib.SMTP_SSL(self.config.smtp_server, self.config.smtp_port)  # 创建SSL连接
            server.login(smtp_user, smtp_password)  # 登录SMTP服务器
            server.sendmail(smtp_user, recipient_email, msg.as_string())  # 发送邮件
            server.quit()  # 关闭服务器连接

            print(f"成功发送 {date} 的邮件通知给 {recipient_email}")  # 打印发送成功日志
            return True
        except Exception as e:  # 捕获所有可能的异常
            print(f"为 {recipient_email} 发送邮件失败 ({file_path}): {e}")  # 打印发送失败日志
            return False

    def _get_email_list(self) -> list[str]:
        """获取收件人邮箱列表
        
        该方法负责从配置文件中指定的收件人列表文件读取邮箱地址，主要步骤：
        1. 检查收件人列表文件是否存在
        2. 读取文件内容
        3. 过滤出有效的邮箱地址（非空且包含@符号）
        4. 验证是否包含有效的邮箱地址
        5. 处理可能的异常情况
        
        返回：
            list[str]: 有效的邮箱地址列表
                       如果文件不存在、没有有效邮箱或发生错误，返回空列表
        """
        try:
            recipient_file = self.config.recipient_list_file  # 获取收件人列表文件路径
            if not recipient_file.exists():
                print(f"{recipient_file} 文件不存在，请创建该文件并添加邮箱地址（每行一个）")
                return []

            with recipient_file.open('r', encoding='utf-8') as f:
                # 过滤出有效的邮箱地址：非空且包含@符号
                emails = [line.strip() for line in f if line.strip() and '@' in line]

            if not emails:  # 检查是否有有效邮箱
                print(f"{recipient_file} 文件中没有找到有效的邮箱地址")
                return []

            print(f"从 {recipient_file} 中读取到{len(emails)}个邮箱地址")  # 打印读取结果
            return emails  # 返回有效邮箱列表
        except Exception as e:  # 捕获所有可能的异常
            print(f"读取邮箱列表时出错: {e}")
            return []

    def _locate_target_file(self) -> Path | None:
        """定位目标通知文件
        
        该方法按照以下优先级策略定位目标通知文件：
        1. 检查事件目录是否存在
        2. 如果指定了target_date：
           a. 验证日期格式是否有效
           b. 尝试查找指定日期的JSON文件
        3. 如果未指定target_date：
           a. 尝试查找前一天的JSON文件
           b. 如果前一天文件不存在，查找目录中最新修改的JSON文件
        
        返回：
            Path | None: 找到的目标文件路径，如果未找到返回None
        """
        if not self.events_dir.exists():
            print(f"目录 {self.events_dir} 不存在，请确保该目录已创建")
            return None

        json_files = sorted(self.events_dir.glob('*.json'))  # 获取所有JSON文件
        if not json_files:
            print(f"在 {self.events_dir} 目录中没有找到JSON文件")
            return None

        if self.target_date:  # 如果指定了日期
            try:
                target = datetime.datetime.strptime(self.target_date, '%Y-%m-%d')  # 解析日期格式
            except ValueError:
                print(f"指定的日期格式无效: {self.target_date}，请使用 YYYY-MM-DD")
                return None

            target_file = self.events_dir / f"{target.strftime('%Y-%m-%d')}.json"  # 构造目标文件路径
            if target_file.exists():
                print(f"使用指定日期的JSON文件: {target_file}")
                return target_file

            print(f"未找到指定日期 {target.strftime('%Y-%m-%d')} 的文件")
            return None

        # 未指定日期，尝试查找前一天的文件
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)  # 获取前一天日期
        yesterday_file = self.events_dir / f"{yesterday.strftime('%Y-%m-%d')}.json"  # 构造前一天文件路径
        if yesterday_file.exists():
            print(f"找到前一天的JSON文件: {yesterday_file}")
            return yesterday_file

        # 前一天文件不存在，查找最新修改的文件
        json_files.sort(key=lambda path: path.stat().st_mtime, reverse=True)  # 按修改时间降序排序
        latest_file = json_files[0]  # 获取最新的文件
        print(f"未找到前一天文件，使用最新的JSON文件: {latest_file}")
        return latest_file

    def _process_new_files(self) -> None:
        """处理通知文件并发送邮件
        
        该方法是 Sender 类的核心处理逻辑，负责协调所有邮件发送相关的操作：
        1. 定位目标通知文件
        2. 获取收件人邮箱列表
        3. 获取SMTP服务器认证信息
        4. 为每个收件人发送邮件
        5. 统计并打印发送结果
        6. 处理整个过程中可能出现的异常
        
        注意事项：
        - 任何一个步骤失败都会导致后续步骤不执行
        - 发送结果会被详细记录和统计
        """
        try:
            target_file = self._locate_target_file()  # 定位目标通知文件
            if not target_file:
                return

            email_list = self._get_email_list()  # 获取收件人邮箱列表
            if not email_list:
                return

            smtp_user, smtp_password = self._get_smtp_credentials()  # 获取SMTP认证信息
            if not smtp_user or not smtp_password:
                return

            success_count = 0  # 统计成功发送的邮件数
            for email in email_list:
                if self._send_email(target_file, email, smtp_user, smtp_password):
                    success_count += 1

            print(f"邮件发送完成，成功: {success_count}/{len(email_list)}")  # 打印发送结果统计
        except Exception as e:
            print(f"处理文件时出错: {e}")  # 处理异常情况


if __name__ == '__main__':
    """脚本入口点
    
    当直接运行 Sender.py 脚本时，会执行以下操作：
    1. 创建命令行参数解析器
    2. 添加 --date 参数（可选），用于指定要发送的通知日期
    3. 解析命令行参数
    4. 创建 Sender 实例并启动邮件发送流程
    
    使用示例：
    - 默认发送前一天的通知：python Sender.py
    - 指定日期发送通知：python Sender.py --date 2025-12-15
    
    参数说明：
    --date: 可选参数，指定要发送的通知日期，格式为 YYYY-MM-DD
            如果不指定，默认发送前一天的通知
    """
    parser = argparse.ArgumentParser(description='发送OA通知邮件')  # 创建命令行参数解析器
    parser.add_argument('--date', help='指定要发送的通知日期，格式 YYYY-MM-DD')  # 添加日期参数
    args = parser.parse_args()  # 解析命令行参数

    Sender(target_date=args.date).run()  # 创建Sender实例并启动邮件发送流程
