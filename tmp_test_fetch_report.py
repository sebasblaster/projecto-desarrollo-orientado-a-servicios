import requests
url='http://127.0.0.1:5000/api/reports/usuarios?format=pdf'
headers={'X-User-Role':'admin','X-Client':'react'}
try:
    r=requests.get(url, headers=headers, timeout=10)
    print('status', r.status_code)
    if r.status_code==200:
        with open('report_test.pdf','wb') as f:
            f.write(r.content)
        print('Saved report_test.pdf, bytes=', len(r.content))
    else:
        print('Response text:', r.text)
except Exception as e:
    print('Error', e)
