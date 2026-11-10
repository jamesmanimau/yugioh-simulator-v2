function refeshPage() {
    window.location.href = window.location.href.replace(/#.*$/, '');
}
// Named scrollToId on purpose: a global scrollTo() replaces window.scrollTo and breaks
// window.scrollTo(x, y) for every caller (ScrollBottom(), SweetAlert2, ...).
function scrollToId(id) {
    if (id) {
        var elmnt = document.getElementById(`${id}`);
        elmnt.scrollIntoView();
    }
}
function CopyToClipboard(text) {
    console.log(text);
    navigator.clipboard.writeText(text).then(function () {
        ShareLinkSuccess();
    }, function () {
        ShareLinkFailed();
    });
}
function ShareLinkSuccess() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1200
    });
    Toast.fire({
        icon: 'success',
        title: 'Link đã được Copy'
    });
}
function ShareLinkFailed() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1200
    });
    Toast.fire({
        icon: 'error',
        title: 'Copy Link Xảy Ra Lỗi'
    });
}

function AddToCartSuccess() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
    });
    Toast.fire({
        icon: 'success',
        title: 'Đã thêm vào giỏ hàng <3!'
    });
}


function NeedItemInCart() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Giỏ hàng trống!',
        showConfirmButton: false,
        timer: 1300,
        text: 'Bạn mua gì đó thì mới thanh toán được :(',
    })
}
function SetCurrentCart(carts) {
    localStorage.setItem("MyCurrentCart", carts);
}
function GetCurrentCart() {
    return localStorage.getItem("MyCurrentCart");
}
function SetCurrentInfo(info) {
    localStorage.setItem("MyCurrentInfo", info);
}
function GetCurrentInfo() {
    return localStorage.getItem("MyCurrentInfo");
}
function SetCurrentShipMethod(method) {
    localStorage.setItem("MyCurrentShipMethod", method);
}
function GetCurrentShipMethod() {
    return localStorage.getItem("MyCurrentShipMethod");
}
function SetCurrentNote(note) {
    localStorage.setItem("MyCurrentNote", note);
}
function GetCurrentNote() {
    return localStorage.getItem("MyCurrentNote");
}
function SetTopDeckDetailsPage(topDeckDetailsMemory) {
    var obj = JSON.parse(topDeckDetailsMemory);
    localStorage.setItem("MyCurrentTopDeckPage_" + obj.Name, topDeckDetailsMemory);
}
function GetTopDeckDetailsPage(gameplay) {
    return localStorage.getItem("MyCurrentTopDeckPage_" + gameplay);
}
function GetShipMethodValue() {
    return document.querySelector('input[name="shipping-method"]:checked').value;
}

function EmailMissing() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Email is missing!',
        showConfirmButton: false,
        timer: 1300,
        text: 'You need to fill up email field.',
    })
}
function IncorrectPasswordFormatVN() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Không thể sử dụng mật khẩu này!',
        showConfirmButton: true,
        text: 'Phải chứa ít nhất một kí tự viết Hoa, một số, một kí tự đặc biệt, và dài tối thiểu 8 kí tự.',
    })
}
function PasswordNotMatched() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Mật khẩu không khớp!',
        showConfirmButton: true,
        text: 'Mật khẩu và xác nhận mật khẩu phải khớp với nhau.',
    })
}
function DuplicateUser() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Không thể sử dụng email này!',
        showConfirmButton: true,
        text: 'Email này đã được người khác sử dụng.',
    })
}

function ErrorMissingImage() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Image is missing!',
        showConfirmButton: false,
        timer: 1300,
        text: 'You need to upload a Image.',
    })
}


function AddItemToWishList() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1200,
        iconColor: '#d47bcf',
    });
    Toast.fire({
        icon: 'success',
        title: 'Item is added to your wishlist'
    });
}


function AddItemToCompare() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1200,
        iconColor: '#8bc7ff',
    });
    Toast.fire({
        icon: 'success',
        title: 'Item is added to your compare list'
    });
}


function DupplicateSlug() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! You can not use this title/name!',
        showConfirmButton: false,
        timer: 1300,
        text: 'You need to enter a different Title/Name',
    })
}


function SomethingWentWrong() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Something went wrong!',
        showConfirmButton: false,
        timer: 1300,
        text: 'Check with Dev team to resolve this error',
    })
}
function MissingPassword() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Password is missing!',
        showConfirmButton: false,
        timer: 1300,
        text: 'You need to fill in the password field',
    })
}
function PasswordNotMatch() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Password not match!',
        showConfirmButton: false,
        timer: 1300,
        text: 'Password and Confirm Password not match',
    })
}
function IncorrectPasswordFormat() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Incorrect Password Format!',
        showConfirmButton: false,
        timer: 1600,
        text: 'Password need to have at least 1 upper case, 1 lower case, 1 special character, and 1 number',
    })
}
function PasswordTooShort() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Your password is too short!',
        showConfirmButton: false,
        timer: 1300,
        text: 'Password need at least 8 characters',
    })
}

function AddingSuccess() {
    Swal.fire({
        icon: 'success',
        title: 'Yay! Success!',
        showConfirmButton: false,
        timer: 1300
    })
}
function UserAddDeck() {
    Swal.fire({
        icon: 'success',
        title: 'Yay! Bạn đã tạo deck thành công!',
        showConfirmButton: true,
        text: 'Bạn có thể xem deck đã được tạo ở mục Deck của tôi!!!',
    })
}
function UserUpdateInformationSuccess() {
    Swal.fire({
        icon: 'success',
        title: 'Yay! Bạn đã lưu thông tin cá nhân thành công!',
        showConfirmButton: true
    })
}
function UserUpdateEmailSuccess() {
    Swal.fire({
        icon: 'success',
        title: 'Yay! Bạn đã lưu Email thành công!',
        showConfirmButton: true,
        text: 'Bạn hãy kiểm tra Email để xác nhận email mới !!!',
    })
}
function UserUpdatePasswordSuccess() {
    Swal.fire({
        icon: 'success',
        title: 'Yay! Bạn đã đổi mật khẩu thành công!',
        showConfirmButton: true
    })
}
function UserUpdatePasswordError() {
    Swal.fire({
        icon: 'error',
        title: 'Whoops! Có lỗi trong quá trình lưu thông tin!',
        showConfirmButton: true,
        text: 'Mật khẩu không đúng hoặc có lỗi trong quá trình lưu dữ liệu!!!',
    })
}

function UserUpdateInformationError() {
    Swal.fire({
        icon: 'error',
        title: 'Whoops! Có lỗi trong quá trình lưu thông tin!',
        showConfirmButton: true
    })
}

function UserSaveDeck() {
    Swal.fire({
        icon: 'success',
        title: 'Yay! Bạn cập nhật deck thành công!',
        showConfirmButton: true
    })
}
function UserDeleteDeck() {
    Swal.fire({
        icon: 'success',
        title: 'Yay! Bạn đã xoá deck thành công!',
        showConfirmButton: true
    })
}

function UserDeckMissing() {
    Swal.fire({
        icon: 'error',
        title: 'Whoops! Thiếu Card!',
        showConfirmButton: true,
        text: 'Bạn phải thêm đủ card vào deck để tạo deck nhé!!!',
    })
}

function AddingCommentSuccess() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        iconColor: '#13ff03',
    });
    Toast.fire({
        icon: 'success',
        title: 'Đăng bình luận thành công!'
    });
}
function ErrorVN() {
    Swal.fire({
        icon: 'error',
        title: 'Có lỗi xảy ra!',
        showConfirmButton: false,
        timer: 1300,
        text: 'Hãy liên lạc với chúng tôi'
    })
}


function AddingReview() {
    Swal.fire({
        icon: 'success',
        title: 'Thank you for your review!',
        showConfirmButton: false,
        timer: 1300
    })
}

function UpdateOrderSuccess() {
    Swal.fire({
        icon: 'success',
        title: 'Update Order Success!',
        showConfirmButton: false,
        timer: 1200
    })
}
function BoxIsMissing() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Cards are missing!',
        showConfirmButton: false,
        timer: 1300,
        text: 'You need to select a card to create a box !!!',
    })
}
function AddCardEmpty() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Card or Quantity is empty!',
        showConfirmButton: false,
        timer: 1300,
        text: 'You need to select a card with quantity > 0 !!!',
    })
}
function exceedNumberOfDeck() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Bạn có quá nhiều Deck!',
        showConfirmButton: true,
        html: 'Giới hạn số lượng Deck của YGO Việt Nam là 40 Deck <br/> Vui lòng hãy xóa bớt deck trước khi thêm deck mới hoặc mua gói thành viên!!!',
    })
}
function alreadyInstalledPWA() {
    Swal.fire({
        icon: 'error',
        title: 'Oops! Có lỗi!',
        showConfirmButton: true,
        html: 'Bạn đã cài đặt ứng dụng web vào điện thoại rồi!!!',
    })
}

function ScrollUp() {
    document.documentElement.scrollTop = 0;
}
function ScrollBottom() {
    window.scrollTo(0, document.body.scrollHeight);
}
function ScrollToWorkSection() {
    document.getElementById("workSection").scrollIntoView();

}

function GetScreenWidth() {
    return window.innerWidth;
}

function refeshCurrentPage() {
    location.reload();
}

async function DownloadFile(fileName, contentStreamReference, contentType) {
    const arrayBuffer = await contentStreamReference.arrayBuffer();
    let blob = new Blob([arrayBuffer]);
    var link = document.createElement('a');
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}

var deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
});

async function installPWA() {

    if (deferredPrompt !== null) {
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt = null;
            }
        } catch (error) {
            console.log(error);
            alreadyInstalledPWA();
        }

    }
}

function SetLocalStorage(name, obj) {
    localStorage.setItem(name, obj);
}
function GetLocalStorage(name) {
    return localStorage.getItem(name);
}