# FPT Simple chain

## Setup
1. clone repo
2. npm install
3. npm start
4. open chrome
5. Add a tx: http://localhost:3000/tx?from=thi&to=vinh&value=100&fee=1
6. view mining progress at terminal window
7. view blockchain data at http://localhost:3000/

## Homework
1. Mỗi block cần có thêm timestamp (thời gian mine). Timestamp cũng cần nằm trong hash. Hãy sửa code
2. Mỗi block cần có thêm prevHash chứa giá trị hash của block trước đó. prevHash cũng cần nằm trong hash của block. Hãy sửa code
3. Khi đang mine mà có node khác mine xong trước, gửi kết quả sang. Hãy tiếp nhận, kiểm tra hash có valid ko, rồi thêm vào blockchain. Sau đó bỏ các tx đó ra khỏi txPool. Rồi thực hiện mine block tiếp theo. Hãy sửa code.
4. Trong class blockchain, hãy thêm hàm tính balance (số dự) của 1 địa chỉ (hãy dựa vào lịch sử from/to và value để tính balance)
