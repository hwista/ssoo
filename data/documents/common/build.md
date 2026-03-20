git lab 주소: http://10.125.31.72:8010/

서버장비명	호스트명	ip주소
lscsoqweb_A	lscsoqweb	10.152.1.41
lscsoqap_A	lscsoqap	10.152.2.41
lscsoqdev_A	lscsoqdev	10.152.9.41

접속 계정
원픽 url
운영: https://onepick.lscns.com/
개발: http://10.152.9.41:8081/

100512 경신전선 100480 가온전선 100635 대원전선

wjstjs1234!

판토스 = 511365
프라임글로벌= 511680
부용물류= 511751

---
소스세팅 정보
<원픽 - front 세팅>
1. node.js LTS 다운로드 & 설치
2. 설치된 폴더로 이동하여 커맨드창에서 npm install을 입력한다.
3. vue cli 설치
  - 커맨드 입력 npm install -g @vue/cli
 
4. 커맨드 입력 npm run serve
  - 실패를 할 경우
     10.1 내려받은 파일에서 .env와 같은 파일이 있는지 확인해야 함
     10.2 내려받은 파일이 다 있는대도 오류 발생 시
            install 시 문제가 발생한 것일 수도 있기 때문에 소스폴더 안에 node_modules폴더 삭제, package-lock.json 파일 삭제
            그리고 커맨드에서 npm cache clean --force입력(캐쉬 삭제) 한 후 다시
            npm install을 한다.
 
<원픽 -back 세팅>
1.인텔리J(기준)에서 확인
  - clone을 한 폴더를 열고 Grandle Build script found에서 import를 클릭한다.
 
2. Gradle Project가 잡히지 않을 때(프로젝트 명을 클릭했을 때 발생할 수 있음)
  - 프로젝트를 Close한 상태에서 소스폴더에 .Idea삭제 후 import를 선택한다.
 
3.Run/Debug configrations
  - Add New Configuration
    - Application
      - Name : 이름 지정
 
  - Main class : com.ls.LsApplication
  - VM options : -Dspring.profiles.active=development (이건 설정값항목을 추가해야한다) // 운영이라면 -Dspring.profiles.active=product (이건 설정값항목을 추가해야한다)

.\gradlew bootRun --args='--spring.profiles.active=development'

  - JRE : 1.8
  - module : 지정해야 함
  - cp : lscns-sales-oneq.main

# One-Pick 프로젝트 정리

## GitLab
- 주소: http://10.125.31.72:8010/

## 서버 목록
| 서버장비명 | 호스트명    | IP 주소       |
|-----------|-------------|---------------|
| lscsoqweb_A | lscsoqweb | 10.152.1.41   |
| lscsoqap_A  | lscsoqap  | 10.152.2.41   |
| lscsoqdev_A | lscsoqdev | 10.152.9.41   |

## 접속 정보
- 운영 URL: https://onepick.lscns.com/
- 개발 URL: http://10.152.9.41:8081/

## 기타 코드/정보
- 거래처 코드 예시: 100512 경신전선, 100480 가온전선, 100635 대원전선
- 비밀번호(예시): wjstjs1234!
- 업체 코드: 판토스 = 511365, 프라임글로벌 = 511680, 부용물류 = 511751

---

## 소스 세팅 정보

### 프론트엔드(원픽 - front)
1. Node.js LTS 설치
2. 프로젝트 폴더에서:
    - `npm install`
3. Vue CLI 전역 설치:
    - `npm install -g @vue/cli`
4. 개발 서버 실행:
    - `npm run serve`

문제 발생 시:
- 프로젝트에 `.env` 같은 파일이 있는지 확인
- 설치 문제 의심 시 `node_modules`와 `package-lock.json` 삭제 후:
  - `npm cache clean --force`
  - `npm install`

### 백엔드(원픽 - back)
1. IntelliJ에서 프로젝트 열기
    - Clone한 폴더에서 Gradle Build script found → Import
2. Gradle Project가 잡히지 않으면:
    - 프로젝트 Close 후 소스 폴더의 `.idea` 삭제 후 다시 Import
3. Run/Debug Configuration 설정:
    - Add → Application
      - Main class: `com.ls.LsApplication`
      - VM options: `-Dspring.profiles.active=development` (운영: `product`)
      - JRE: 1.8
      - module: 지정 필요
      - classpath 예: `lscns-sales-oneq.main`

실행 커맨드 예:
- `.\gradlew bootRun --args='--spring.profiles.active=development'`