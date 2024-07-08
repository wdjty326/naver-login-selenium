# 네이버 로그인 세션 가져오기
네이버 NID_SES를 가져오는 AWS Lambda 함수입니다.

## 시작하기
적용 전, 개발환경은 module 로 작업하였으며, 노드버전은 `.nvmrc`로 확인바랍니다.

계층은 [@sparticuz/chromium](https://github.com/Sparticuz/chromium/releases) 에서 122 이하버전으로 사용바랍니다. 혹은, 별도 chromium을 직접 올리셔도 됩니다.

메인코드만 작성된 상태며, aws serverless 환경을 수동으로 설정하였기 때문에 직접 배포해야합니다. serverless는 권한 처리 확인후에 적용하겠습니다.

자동화툴은 마이크로소프트에서 개발한 [playwright](https://github.com/microsoft/playwright) 를 사용했습니다.