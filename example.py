import requests
url = 'http://oa.stu.edu.cn/page/maint/template/news/newstemplateprotal.jsp?templatetype=1&templateid=3&docid=44193'
re = requests.get(url)
with open('re13.html', 'w', encoding='utf-8') as f:
    f.write(re.text)