// CryptoController
using Microsoft.AspNetCore.Mvc;
namespace CryptoTradingPlatform.Controllers;

public class CryptoController : Controller
{
    private readonly ApplicationDbContext _context;

    public CryptoController(ApplicationDbContext context)
    {
        _context = context;
    }

    public IActionResult Index()
    {
        var cryptos = _context.Cryptos.ToList();
        return View(cryptos);
    }

    [HttpGet]
    public IActionResult Prices()
    {
        var prices = _context.PrixCryptos.ToList();
        return Json(prices);
    }
}