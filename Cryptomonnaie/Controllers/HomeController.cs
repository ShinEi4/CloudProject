using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Cryptomonnaie.Models;

namespace Cryptomonnaie.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return File("~/Page/index.html", "text/html");
    }

    public IActionResult Privacy()
    {
        return View();
    }

    public IActionResult Register()
    {
        return File("~/Page/register.html", "text/html");
    }

    public IActionResult Home()
    {
        return View();
    }

    public IActionResult Cours()
    {
        return File("~/Page/crypto-cours.html", "text/html");
    }

    public IActionResult Profile()
    {
        return File("~/Page/profile.html", "text/html");
    }

    public IActionResult Login()
    {
        return File("~/Page/login.html", "text/html");
    }

    public IActionResult Portfolio()
    {
        return File("~/Page/crypto-portfolio.html", "text/html");
    }

    public IActionResult Transactions()
    {
        return File("~/Page/transactions.html", "text/html");
    }

    public IActionResult Commissions()
    {
        return File("~/Page/commissions.html", "text/html");
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
